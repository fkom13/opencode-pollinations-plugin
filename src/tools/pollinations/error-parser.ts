/**
 * Structured error parsing (v6.5) — single parser for Pollinations error
 * envelopes instead of `includes('402')` scattered across tools.
 *
 * Live envelope (Phase 2 T11):
 *   { "success": false, "code": "BAD_REQUEST", "timestamp": "...",
 *     "details": { "name": "UpstreamError", "upstreamStatus": 400,
 *       "upstreamHost": "...", "upstreamBody": "..." } }
 *
 * Safety: `upstreamHost` / `upstreamBody` reveal the real backend and are
 * NEVER exposed to the user — kept only in the sanitized debug fields.
 */

export type PolliErrorKind =
    | 'payment'      // 402 — insufficient funds
    | 'auth'         // 401/403 — key/permission
    | 'rate_limit'   // 429
    | 'bad_request'  // 400/422 — params
    | 'not_found'    // 404
    | 'upstream'     // 5xx
    | 'timeout'
    | 'network'
    | 'unknown';

export interface ParsedPolliError {
    kind: PolliErrorKind;
    code?: string;
    status?: number;
    message: string;
    /** Sanitized debug info (backend host/body redacted). */
    debug?: {
        upstreamStatus?: number;
        upstreamHost?: string;
        upstreamBodyTruncated?: string;
    };
}

/** Map an HTTP status code to an error kind. */
export function kindForStatus(status: number): PolliErrorKind {
    if (status === 402) return 'payment';
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'rate_limit';
    if (status === 400 || status === 422) return 'bad_request';
    if (status === 404) return 'not_found';
    if (status >= 500) return 'upstream';
    return 'unknown';
}

/**
 * Parse an error body string (or object) into a structured error.
 * Handles the Pollinations envelope, OpenAI-style {error:{message,code}},
 * and plain text. upstreamHost/upstreamBody are never exposed in `message`.
 */
export function parsePolliError(body: string | Record<string, any> | null | undefined, status?: number): ParsedPolliError {
    const kind = status !== undefined && status !== 0 ? kindForStatus(status) : 'unknown';

    if (body === null || body === undefined || body === '') {
        return { kind, status, message: `HTTP ${status ?? 'error'}` };
    }

    let parsed: any = null;
    if (typeof body === 'string') {
        try { parsed = JSON.parse(body); } catch { parsed = null; }
    } else {
        parsed = body;
    }

    if (parsed && typeof parsed === 'object') {
        // Pollinations envelope
        if (parsed.success === false && (parsed.code || parsed.details)) {
            const details = parsed.details || {};
            const cleanMessage = typeof parsed.message === 'string'
                ? parsed.message
                : (parsed.code || 'Upstream error');
            return {
                kind,
                code: parsed.code,
                status,
                message: `${cleanMessage}${details.upstreamStatus !== undefined ? ` (upstream ${details.upstreamStatus})` : ''}`,
                debug: {
                    upstreamStatus: details.upstreamStatus,
                    upstreamHost: typeof details.upstreamHost === 'string' ? details.upstreamHost : undefined,
                    upstreamBodyTruncated: typeof details.upstreamBody === 'string' ? details.upstreamBody.slice(0, 200) : undefined,
                },
            };
        }
        // OpenAI-style
        if (parsed.error && typeof parsed.error === 'object') {
            return {
                kind,
                code: parsed.error.code,
                status,
                message: parsed.error.message || `HTTP ${status ?? 'error'}`,
            };
        }
        if (typeof parsed.message === 'string') {
            return { kind, status, message: parsed.message };
        }
    }

    // Plain text
    const text = typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300);
    return { kind, status, message: text };
}

/**
 * Parse a thrown error (Error object or string) into a structured error.
 * Detects the envelope inside messages like "HTTP 402: {...json...}".
 */
export function parsePolliErrorFromThrow(error: unknown): ParsedPolliError {
    if (error instanceof Error) {
        const msg = error.message || '';
        // Timeout markers
        if (/timeout/i.test(msg) && !/HTTP \d/.test(msg)) {
            return { kind: 'timeout', message: msg };
        }
        // "HTTP 402: {envelope}" pattern from shared.ts httpsGet
        const httpMatch = msg.match(/HTTP (\d{3})/);
        if (httpMatch) {
            const status = parseInt(httpMatch[1], 10);
            const body = msg.slice(msg.indexOf(':', msg.indexOf(httpMatch[0])) + 1).trim();
            const parsed = parsePolliError(body || null, status);
            return parsed;
        }
        if (/Network Error|fetch failed|ECONN|ETIMEDOUT/i.test(msg)) {
            return { kind: 'network', message: msg };
        }
        return { kind: 'unknown', message: msg };
    }
    return { kind: 'unknown', message: String(error) };
}
