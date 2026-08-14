/**
 * Tool Capability Registry (v6.5) — capability-centric, declarative.
 *
 * Answers "HOW to execute this capability" — endpoint, transport, execution
 * mode, timeouts, retry/recovery policy, artifact format, backend overrides.
 *
 * The Model Registry remains model-centric ("WHAT exists"). The TCR
 * references/enriches it and does NOT duplicate model fields (pricing,
 * paid_only, modalities stay in the Model Registry).
 *
 * Overrides that the live catalog does NOT expose (special headers, endpoint
 * quirks, token formats) live here — never as `if (model === ...)` scattered
 * across tools.
 */

import { resolveEffectiveTimeout, lookupTimeoutOverride, DEFAULT_TIMEOUT_HIERARCHY, type TimeoutHierarchy, type UserTimeoutConfig } from './timeout-policy.js';

export type ExecutionMode = 'SHORT_REQUEST' | 'LONG_BLOCKING' | 'ASYNC_JOB' | 'STREAMING' | 'LOCAL';

export type RetryPolicy =
    | 'NO_AUTOMATIC_RETRY'      // new submission may double-bill → never auto-replay
    | 'SAFE_READ_ONLY'          // idempotent reads → safe to retry
    | 'RECOVER_SAME_REQUEST'    // same-request re-query hits server dedup cache (1 bill)
    | 'REPOLL_JOB';             // tier service job: re-poll job.id, never resubmit

export interface ToolModelCapability {
    capability: string;
    backend: string;
    modelId?: string;

    transport: {
        endpoint: string;
        method: 'GET' | 'POST' | 'WS';
        mode: ExecutionMode;
    };

    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    constraints?: Record<string, unknown>;
    pricing?: Record<string, unknown>;

    execution: {
        defaultTimeoutSeconds?: number;
        maxTimeoutSeconds?: number;
        retryPolicy: RetryPolicy;
        idempotency?: 'SERVER_DEDUP' | 'NONE';
        pollIntervalSeconds?: number;
        supportsCancel?: boolean;
        recovery?: string;
    };

    backendOverrides?: Record<string, unknown>;
}

export const TOOL_CAPABILITIES: ToolModelCapability[] = [
    // ── Pollinations generation (cache-backed, LONG_BLOCKING, SERVER_DEDUP) ──
    {
        capability: 'gen_image',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/image/{prompt}', method: 'GET', mode: 'LONG_BLOCKING' },
        execution: {
            defaultTimeoutSeconds: 600,
            retryPolicy: 'RECOVER_SAME_REQUEST',
            idempotency: 'SERVER_DEDUP',
            supportsCancel: false,
            recovery: 'same request (same model/params/seed) → cache hit, not rebilled',
        },
        backendOverrides: {
            'gpt-image-2': { quality: ['low', 'med', 'high'], transparent: true },
            kontext: { header: 'x-usage-completion-image-tokens' },
            klein: { header: 'x-usage-completion-image-tokens' },
        },
    },
    {
        capability: 'gen_video',
        backend: 'pollinations',
        // v6.5: /video/{prompt} is the canonical route (SDK/CLI).
        transport: { endpoint: 'https://gen.pollinations.ai/video/{prompt}', method: 'GET', mode: 'LONG_BLOCKING' },
        execution: {
            defaultTimeoutSeconds: 1800,
            retryPolicy: 'RECOVER_SAME_REQUEST',
            idempotency: 'SERVER_DEDUP',
            supportsCancel: false,
            recovery: 'same request (same model/params/seed) → cache hit, not rebilled',
        },
        backendOverrides: {
            wan: { requiresReferenceImage: true, t2vDummyImage: true },
            veo: { interpolationRefs: 2 },
            'seedance-*': { headerVideoTokens: true, fixedDuration4s: true },
            'ltx-2': { error520Known: true },
            'grok-video-pro': { forceAudio: true },
        },
    },
    {
        capability: 'gen_3d',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/3d/{prompt}', method: 'GET', mode: 'LONG_BLOCKING' },
        outputs: { artifactFormat: 'glb', mime: 'model/gltf-binary' },
        execution: {
            defaultTimeoutSeconds: 1800,
            retryPolicy: 'RECOVER_SAME_REQUEST',
            idempotency: 'SERVER_DEDUP',
            supportsCancel: false,
            recovery: 'same request (same model/params/seed) → model3dCache hit, not rebilled',
        },
        backendOverrides: {
            'trellis-2': { resolutions: ['low', 'medium', 'high'], timeoutSeconds: 1200, maxRefImages: 1 },
            'hyper3d-rodin': { timeoutSeconds: 1800 },
        },
    },
    {
        capability: 'tts',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/v1/audio/speech', method: 'POST', mode: 'SHORT_REQUEST' },
        execution: { defaultTimeoutSeconds: 600, retryPolicy: 'NO_AUTOMATIC_RETRY', idempotency: 'SERVER_DEDUP' },
        backendOverrides: {
            elevenlabs: { voices: 'registry' },
            'openai-audio': { voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], formats: ['mp3', 'wav', 'pcm16'] },
        },
    },
    {
        capability: 'music',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/audio/{prompt}', method: 'GET', mode: 'LONG_BLOCKING' },
        execution: { defaultTimeoutSeconds: 600, retryPolicy: 'NO_AUTOMATIC_RETRY', idempotency: 'SERVER_DEDUP' },
        constraints: { maxDurationSeconds: 300 },
    },
    {
        capability: 'stt',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/v1/audio/transcriptions', method: 'POST', mode: 'SHORT_REQUEST' },
        execution: { defaultTimeoutSeconds: 600, retryPolicy: 'NO_AUTOMATIC_RETRY' },
    },
    {
        capability: 'web_search',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/v1/chat/completions', method: 'POST', mode: 'SHORT_REQUEST' },
        execution: { defaultTimeoutSeconds: 300, retryPolicy: 'NO_AUTOMATIC_RETRY' },
    },
    {
        capability: 'embed',
        backend: 'pollinations',
        transport: { endpoint: 'https://gen.pollinations.ai/v1/embeddings', method: 'POST', mode: 'SHORT_REQUEST' },
        // Billable POST → never auto-replay (NOT a read-only operation).
        execution: { defaultTimeoutSeconds: 60, retryPolicy: 'NO_AUTOMATIC_RETRY', idempotency: 'NONE' },
    },

    // ── Tier services (true ASYNC_JOB with job.id, re-poll safe) ──
    {
        capability: 'video_free',
        backend: 'playground',
        transport: { endpoint: 'https://pruna-playground-production-861e.up.railway.app/api/p-video/generate', method: 'POST', mode: 'ASYNC_JOB' },
        execution: {
            defaultTimeoutSeconds: 900,
            retryPolicy: 'REPOLL_JOB',
            idempotency: 'NONE',
            pollIntervalSeconds: 4,
            supportsCancel: false,
            recovery: 're-poll job.id (never resubmit)',
        },
    },
    {
        capability: 'remove_background',
        backend: 'imgtools',
        // No modelId — the TCR is capability-centric, not model-centric.
        transport: { endpoint: 'https://rmbg.bgeraser.com/api/rmbg', method: 'POST', mode: 'ASYNC_JOB' },
        execution: {
            defaultTimeoutSeconds: 300,
            retryPolicy: 'REPOLL_JOB',
            pollIntervalSeconds: 5,
            supportsCancel: false,
            recovery: 're-poll job.id / key rotation + provider fallback',
        },
    },
    {
        capability: 'object_remove',
        backend: 'imgtools',
        transport: { endpoint: 'https://objectremover.com/api/remove', method: 'POST', mode: 'ASYNC_JOB' },
        execution: { defaultTimeoutSeconds: 300, retryPolicy: 'REPOLL_JOB', pollIntervalSeconds: 3 },
    },
    {
        capability: 'image_upscale',
        backend: 'imgtools',
        transport: { endpoint: 'https://imgupscaler.com/api/upscale', method: 'POST', mode: 'ASYNC_JOB' },
        execution: { defaultTimeoutSeconds: 300, retryPolicy: 'REPOLL_JOB', pollIntervalSeconds: 5 },
    },
    {
        capability: 'image_enhance',
        backend: 'imgtools',
        transport: { endpoint: 'https://imgupscaler.com/api/enhance', method: 'POST', mode: 'ASYNC_JOB' },
        execution: { defaultTimeoutSeconds: 300, retryPolicy: 'REPOLL_JOB', pollIntervalSeconds: 3 },
    },
    {
        capability: 'upload',
        backend: 'filehost',
        transport: { endpoint: 'multi-provider cascade', method: 'POST', mode: 'SHORT_REQUEST' },
        // POST upload → NOT a read-only op. The provider cascade is explicit,
        // not an automatic same-request replay.
        execution: { defaultTimeoutSeconds: 45, retryPolicy: 'NO_AUTOMATIC_RETRY', idempotency: 'NONE' },
    },

    // ── Local (offline) ──
    {
        capability: 'qrcode',
        backend: 'local',
        transport: { endpoint: 'local', method: 'GET', mode: 'LOCAL' },
        execution: { retryPolicy: 'SAFE_READ_ONLY' },
    },
    {
        capability: 'palette',
        backend: 'local',
        transport: { endpoint: 'local', method: 'GET', mode: 'LOCAL' },
        execution: { retryPolicy: 'SAFE_READ_ONLY' },
    },
    {
        capability: 'diagram',
        backend: 'mermaid-ink',
        transport: { endpoint: 'https://mermaid.ink', method: 'GET', mode: 'SHORT_REQUEST' },
        execution: { defaultTimeoutSeconds: 15, retryPolicy: 'NO_AUTOMATIC_RETRY' },
    },
];

/** Resolve a capability declaration by name (optionally filtered by backend). */
export function resolveCapability(capability: string, backend?: string): ToolModelCapability | undefined {
    return TOOL_CAPABILITIES.find(c =>
        c.capability === capability && (backend === undefined || c.backend === backend)
    );
}

export function listCapabilities(): string[] {
    return TOOL_CAPABILITIES.map(c => c.capability);
}

/**
 * Effective timeout for a capability+model with full v6.5 precedence:
 * per-call > USER model override > USER capability override
 * > built-in model default > built-in capability > global.
 */
export function resolveCapabilityTimeout(
    capability: string,
    model?: string,
    perCall?: number,
    userConfig?: UserTimeoutConfig | null
): number {
    const cap = resolveCapability(capability);
    return resolveEffectiveTimeout({
        perCall,
        model,
        capabilityKey: mapCapabilityToTimeoutKey(capability),
        longRunning: cap?.transport.mode === 'LONG_BLOCKING',
        user: userConfig ?? null,
    });
}

function mapCapabilityToTimeoutKey(capability: string): string | undefined {
    if (capability === 'gen_image') return 'image';
    if (capability === 'gen_video') return 'video';
    if (capability === 'gen_3d') return 'threeD';
    if (capability === 'tts' || capability === 'music' || capability === 'stt') return 'audio';
    if (capability === 'embed') return 'embed';
    return undefined;
}
