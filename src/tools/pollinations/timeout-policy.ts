/**
 * Timeout Policy (v6.5) — single source of truth for operation timeouts.
 *
 * Hierarchy (highest precedence first):
 *   per-call (timeout_seconds?)
 *   > model/backend override
 *   > capability
 *   > global default
 *
 * Clamp: minimum 10s, absolute maximum = hierarchy.max (3600s).
 * Values based on the Phase 2/2.2 execution audit (server-side limits:
 * trellis ~5 min, hyper3d ~10 min, wan-pro ~15 min, veo/grok ~3 min).
 */

export interface TimeoutHierarchy {
    /** Global default for all remote operations (s). */
    default: number;
    /** Default for long-running generations (s). */
    longRunning: number;
    /** Absolute ceiling (s). */
    max: number;
    /** Capability floors (s). */
    capabilities: Record<string, number>;
    /** Model/backend overrides (s). `"name"` exact match, `"prefix-*"` wildcard. */
    overrides: Record<string, number>;
}

export const DEFAULT_TIMEOUT_HIERARCHY: TimeoutHierarchy = {
    default: 300,
    longRunning: 900,
    max: 3600,
    capabilities: {
        image: 600,
        video: 1800,
        audio: 600,
        threeD: 1800,
        realtime: 300,
        embed: 60,
    },
    overrides: {
        'trellis-2': 1200,       // server ~5 min max
        'hyper3d-rodin': 1800,   // server ~10 min max
        'seedance-*': 900,       // server ~6 min
        'wan-pro': 1800,         // server ~15 min
    },
};

export const MIN_TIMEOUT_SECONDS = 10;
export const MAX_TIMEOUT_SECONDS = 3600;

export interface ResolveTimeoutOptions {
    perCall?: number;
    model?: string;
    capability?: string;
    longRunning?: boolean;
    hierarchy?: TimeoutHierarchy;
}

export interface TimeoutValidation {
    ok: boolean;
    seconds?: number;
    reason?: string;
}

/** Validate a per-call timeout_seconds value (>= 10s, <= 3600s). */
export function validateTimeoutSeconds(value: number | undefined): TimeoutValidation {
    if (value === undefined) return { ok: true };
    if (typeof value !== 'number' || !isFinite(value)) {
        return { ok: false, reason: `timeout_seconds must be a finite number of seconds (got ${value})` };
    }
    if (value < MIN_TIMEOUT_SECONDS) {
        return { ok: false, reason: `timeout_seconds must be >= ${MIN_TIMEOUT_SECONDS}s (got ${value}s)` };
    }
    if (value > MAX_TIMEOUT_SECONDS) {
        return { ok: false, reason: `timeout_seconds must be <= ${MAX_TIMEOUT_SECONDS}s (got ${value}s)` };
    }
    return { ok: true, seconds: value };
}

/**
 * Resolve the effective timeout with full precedence:
 * per-call > model override > capability > (longRunning ? longRunning : default).
 * Result is clamped to [10, hierarchy.max].
 */
export function resolveTimeoutSeconds(opts: ResolveTimeoutOptions): number {
    const hierarchy = opts.hierarchy ?? DEFAULT_TIMEOUT_HIERARCHY;

    let t = opts.longRunning ? hierarchy.longRunning : hierarchy.default;

    if (opts.capability) {
        const capVal = hierarchy.capabilities[opts.capability];
        if (capVal !== undefined) t = capVal;
    }

    if (opts.model) {
        if (hierarchy.overrides[opts.model] !== undefined) {
            t = hierarchy.overrides[opts.model];
        } else {
            for (const [pattern, value] of Object.entries(hierarchy.overrides)) {
                if (pattern.endsWith('*') && opts.model.startsWith(pattern.slice(0, -1))) {
                    t = value;
                    break;
                }
            }
        }
    }

    if (opts.perCall !== undefined) t = opts.perCall;

    return Math.min(Math.max(t, MIN_TIMEOUT_SECONDS), hierarchy.max);
}

/** Merge user-configured timeout overrides (from config) onto the defaults. */
export function mergeTimeoutHierarchy(user?: Partial<TimeoutHierarchy>): TimeoutHierarchy {
    if (!user) return { ...DEFAULT_TIMEOUT_HIERARCHY };
    return {
        default: user.default ?? DEFAULT_TIMEOUT_HIERARCHY.default,
        longRunning: user.longRunning ?? DEFAULT_TIMEOUT_HIERARCHY.longRunning,
        max: user.max ?? DEFAULT_TIMEOUT_HIERARCHY.max,
        capabilities: { ...DEFAULT_TIMEOUT_HIERARCHY.capabilities, ...(user.capabilities || {}) },
        overrides: { ...DEFAULT_TIMEOUT_HIERARCHY.overrides, ...(user.overrides || {}) },
    };
}
