// imgtools/clients.ts — orchestration upload → poll → download pour les 4 outils
// Adapté depuis /home/fkomp/Bureau/oracle/dev-serveur/iamges-tools-api/modules/clients.js
// Mode standalone : appels directs depuis l'IP utilisateur, pas de queue, pas d'API

import { TOOLS, UA } from './config.js';
import type { ToolConfig } from './config.js';
import { getKey, encrypt, decrypt } from './crypto.js';
import { buildMultipart, httpsPost, getDims, aspectRatio, dlImage } from './helpers.js';

export interface ToolInput {
    data: Buffer;
    contentType: string;
    filename: string;
    options?: Record<string, string | number>;
}

export interface ToolResult {
    imageUrl: string;
    downloadUrls: string[];
}

const BASE_HEADERS: Record<string, string> = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
};

function headersFor(t: ToolConfig, contentType?: string): Record<string, string> {
    return {
        ...BASE_HEADERS,
        'Origin': `https://${t.host}`,
        'Referer': t.page,
        ...(contentType ? { 'Content-Type': contentType } : {}),
    };
}

function normalizeUrls(dUrls: unknown): string[] {
    if (Array.isArray(dUrls)) return dUrls.filter(u => u && String(u).trim()).map(u => String(u).trim());
    if (dUrls && typeof dUrls === 'object') {
        return Object.values(dUrls as Record<string, unknown>).filter(u => u && String(u).trim()).map(u => String(u).trim());
    }
    return [];
}

function hasUrls(dUrls: unknown): boolean {
    return normalizeUrls(dUrls).length > 0;
}

function resolveUrls(t: ToolConfig, urls: string[]): ToolResult {
    const resolved = urls.map(u => {
        if (String(u).startsWith('http')) return String(u);
        if (t.resultBase) {
            const fn = String(u).split('/').pop() || '';
            return `${t.resultBase}/${fn}`;
        }
        return String(u);
    });
    return { imageUrl: resolved[0] || '', downloadUrls: resolved };
}

// ─── Legacy (rmbg, upscale) ──────────────────────────────────────────

async function uploadLegacy(t: ToolConfig, file: ToolInput): Promise<{ code: string | null; directUrls?: string[] }> {
    const mpFields: Array<{ name: string; value: Buffer | string; filename?: string; contentType?: string }> = [
        { name: 'file', value: file.data, filename: file.filename || 'image.jpg', contentType: file.contentType || 'image/jpeg' },
    ];
    if (t.uploadFields) {
        for (const [k, v] of Object.entries(t.uploadFields)) {
            let val = v;
            if (k === 'ratio' && file.options?.ratio) val = String(file.options.ratio);
            mpFields.push({ name: k, value: val });
        }
    }
    const { boundary, body } = buildMultipart(mpFields);
    const hdrs = headersFor(t, `multipart/form-data; boundary=${boundary}`);
    const res = await httpsPost(t.host, t.uploadPath, hdrs, body);

    if (res.status !== 200) throw new Error(`Upload ${t.name} failed: ${res.status} ${res.body.toString('utf8').slice(0, 200)}`);
    let json: any;
    try { json = JSON.parse(res.body.toString('utf8')); } catch { throw new Error(`Upload ${t.name} non-JSON: ${res.body.toString('utf8').slice(0, 200)}`); }

    if (json.downloadUrls && hasUrls(json.downloadUrls)) {
        return { code: null, directUrls: normalizeUrls(json.downloadUrls) };
    }
    const code = json.code || json.taskId || json.taskCode || (json.data && (json.data.code || json.data.taskId));
    if (!code) throw new Error(`Upload ${t.name}: no code in ${JSON.stringify(json).slice(0, 300)}`);
    return { code: String(code), directUrls: [] };
}

async function pollLegacy(t: ToolConfig, code: string | string[]): Promise<any> {
    const codes = Array.isArray(code) ? code : [code];
    const bodyObj = t.statusBodyBuilder ? t.statusBodyBuilder(codes) : { type: t.statusType, [t.statusField]: codes };
    const body = JSON.stringify(bodyObj);
    const hdrs = headersFor(t, 'application/json');
    const res = await httpsPost(t.host, t.statusPath, hdrs, body);
    if (res.status !== 200) throw new Error(`Status ${t.name} failed: ${res.status}`);
    try { return JSON.parse(res.body.toString('utf8')); } catch { throw new Error(`Status ${t.name} non-JSON`); }
}

// ─── Encrypted (ruo, enhance) ────────────────────────────────────────

function buildUploadParams(t: ToolConfig, file: ToolInput, dims: { width: number; height: number }, extra: Record<string, string | number>): Record<string, unknown> {
    const ratio = aspectRatio(dims.width, dims.height);
    if (t.name === 'ruo') {
        const p = String(extra.prompt || 'remove unwanted objects');
        return {
            type: t.statusType, selected_model: t.selectedModel, model_name: t.modelName,
            user_id: 'anonymous', tool: t.tool,
            positive_prompts: p, resolved_prompt: p, raw_prompt: p,
            aspect_ratio: ratio, prompt_image_refs: ['primary'], image_order_map: ['primary'],
        };
    }
    if (t.name === 'enhance') {
        const prompt = t.prompt!;
        const tls = Number(extra.targetLongestSide || 1024);
        return {
            positive_prompts: prompt, resolved_prompt: prompt, aspect_ratio: ratio,
            selected_model: t.selectedModel, model_name: t.modelName,
            user_id: 'anonymous', type: t.statusType, target_longest_side: tls,
        };
    }
    throw new Error(`Unknown encrypted tool: ${t.name}`);
}

async function uploadEncrypted(t: ToolConfig, file: ToolInput): Promise<{ code: string }> {
    const key = getKey(t.crypto!.salt);
    const dims = getDims(file.data) || { width: 0, height: 0 };
    const params = buildUploadParams(t, file, dims, file.options || {});
    const enc = encrypt(params, key);
    const { boundary, body } = buildMultipart([
        { name: 'params', value: enc },
        { name: 'file', value: file.data, filename: file.filename || 'image.jpg', contentType: file.contentType || 'image/jpeg' },
        { name: 'selected_model', value: t.selectedModel! },
    ]);
    const hdrs = headersFor(t, `multipart/form-data; boundary=${boundary}`);
    const res = await httpsPost(t.host, t.uploadPath, hdrs, body);

    if (res.status !== 200) throw new Error(`Upload ${t.name} failed: ${res.status}`);
    const json = JSON.parse(res.body.toString('utf8'));
    if (!json.data_enc) throw new Error(`Upload ${t.name}: no data_enc in ${JSON.stringify(json).slice(0, 200)}`);
    const dec = decrypt(json.data_enc, key);
    if (!dec.code) throw new Error(`Upload ${t.name}: no code in decrypted ${JSON.stringify(dec).slice(0, 200)}`);
    return { code: String(dec.code) };
}

async function pollEncrypted(t: ToolConfig, code: string): Promise<any> {
    const key = getKey(t.crypto!.salt);
    const statusPayload = { type: t.statusType, code, user_id: 'anonymous' };
    const enc = encrypt(statusPayload, key);
    const body = JSON.stringify({ params: enc });
    const hdrs = headersFor(t, 'application/json');
    const res = await httpsPost(t.host, t.statusPath, hdrs, body);
    if (res.status !== 200) throw new Error(`Status ${t.name} failed: ${res.status}`);
    const json = JSON.parse(res.body.toString('utf8'));
    if (!json.data_enc) throw new Error(`Status ${t.name}: no data_enc`);
    return decrypt(json.data_enc, key);
}

// ─── Orchestrateur principal ─────────────────────────────────────────

export async function processTool(toolName: string, input: ToolInput): Promise<ToolResult> {
    const t = TOOLS[toolName];
    if (!t) throw new Error(`Unknown tool: ${toolName}`);
    const isEncrypted = !!t.crypto;

    const upRes = isEncrypted
        ? await uploadEncrypted(t, input)
        : await uploadLegacy(t, input);

    if ('directUrls' in upRes && upRes.directUrls && upRes.directUrls.length > 0) {
        return resolveUrls(t, upRes.directUrls);
    }

    const code = 'code' in upRes ? upRes.code! : (upRes as any).code;
    let status: any;
    for (let i = 0; i < t.maxPolls; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, t.pollInterval));
        status = isEncrypted
            ? await pollEncrypted(t, code)
            : await pollLegacy(t, code);

        if (status.status === 'success' || hasUrls(status.downloadUrls)) break;
        if (status.status === 'failed') throw new Error(`Status ${t.name} failed: ${status.message || JSON.stringify(status).slice(0, 200)}`);
        if (status.status && !['processing', 'pending', 'queued', 'waiting'].includes(status.status)) {
            throw new Error(`Status ${t.name} unexpected: ${JSON.stringify(status).slice(0, 300)}`);
        }
    }

    const urls = status ? normalizeUrls(status.downloadUrls) : [];
    if (!urls.length) throw new Error(`Polling ${t.name} timeout: no downloadUrls after ${t.maxPolls} attempts`);
    return resolveUrls(t, urls);
}