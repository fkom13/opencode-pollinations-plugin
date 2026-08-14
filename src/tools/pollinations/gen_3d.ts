/**
 * polli_gen_3d Tool — Pollinations 3D Generation (v6.5)
 *
 * Models (live-validated Phase 2):
 * - trellis-2      — default, ~0.24 pollen (low), GLB, LONG_BLOCKING
 * - hyper3d-rodin  — paid_only, ~0.10 pollen, GLB, LONG_BLOCKING
 *
 * Endpoint: GET /3d/{prompt}?model=...&resolution=...&image=<url>&seed=...
 * Artifact: GLB (glTF-binary) — validated via magic bytes, never written
 *           with a wrong extension.
 *
 * Retry policy: after a client timeout the generation may STILL be running
 * and billed upstream. We never auto-resubmit; we return recovery metadata
 * (same request = cache hit, not rebilled).
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as path from 'path';
import {
    getApiKey,
    hasApiKey,
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    fetchEnterBalance,
    sanitizeFilename,
    validateHttpUrl,
} from './shared.js';
import { ModelRegistry } from '../../server/models/index.js';
import { checkCostControl } from './cost-guard.js';
import { detectArtifactType, persistArtifact } from './artifact-core.js';
import { resolveCapabilityTimeout } from './tool-capability-registry.js';
import { validateTimeoutSeconds } from './timeout-policy.js';
import { loadConfig } from '../../server/config.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'trellis-2';
const DEFAULT_RESOLUTION = 'low';
const VALID_RESOLUTIONS = ['low', 'medium', 'high'];

// Live-observed flat costs (Phase 2 / 2.2). Registry pricing wins when present.
const THREE_D_COST_FALLBACK: Record<string, number> = {
    'trellis-2': 0.24,
    'hyper3d-rodin': 0.10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function estimate3DCost(model: string): number {
    const m = ModelRegistry.getByNameOrAlias('3d', model);
    if (m?.pricing?.completionImageTokens !== undefined) return m.pricing.completionImageTokens;
    if (m?.averageCost !== undefined) return m.averageCost;
    return THREE_D_COST_FALLBACK[model] ?? 0.24;
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGen3dTool: ToolDefinition = tool({
    description: t('tools.gen3d.desc'),

    args: {
        prompt: tool.schema.string().optional().describe(t('tools.gen3d.arg_prompt')),
        image: tool.schema.string().optional().describe(t('tools.gen3d.arg_image')),
        model: tool.schema.string().optional().describe(t('tools.gen3d.arg_model', { model: DEFAULT_MODEL })),
        resolution: tool.schema.enum(VALID_RESOLUTIONS).optional().describe(t('tools.gen3d.arg_resolution', { res: DEFAULT_RESOLUTION })),
        seed: tool.schema.number().optional().describe(t('tools.gen3d.arg_seed')),
        save_to: tool.schema.string().optional().describe(t('tools.gen3d.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.gen3d.arg_filename')),
        timeout_seconds: tool.schema.number().optional().describe(t('tools.gen3d.arg_timeout')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!hasApiKey()) {
            return t('tools.gen3d.req_key');
        }

        const model = args.model || DEFAULT_MODEL;
        const resolution = args.resolution || DEFAULT_RESOLUTION;
        const prompt = args.prompt || (args.image ? '3d model from reference image' : 'a simple 3d object');

        // Known model check (beta passthrough for unknown ids)
        const knownModels = ModelRegistry.list('3d');
        const knownModel = knownModels.some(m => m.name === model || m.aliases.includes(model));
        if (!knownModel) {
            emitStatusToast('warning', t('tools.gen3d.unknown_model', { model }), '🧊 polli_gen_3d');
        }

        // Reference image (1 ref max — trellis uses the image only)
        if (args.image && !validateHttpUrl(args.image)) {
            return t('tools.gen3d.invalid_image_url');
        }

        // Per-call timeout validation (>= 10s, <= 3600s)
        const timeoutCheck = validateTimeoutSeconds(args.timeout_seconds);
        if (!timeoutCheck.ok) {
            return t('tools.gen3d.invalid_timeout', { reason: timeoutCheck.reason || '' });
        }

        // Seed: resolved up-front (recovery metadata — same seed = cache hit).
        const seed = args.seed !== undefined ? args.seed : Math.floor(Math.random() * 1000000);

        // Estimate cost + Cost Guard
        const estimatedCost = estimate3DCost(model);
        const costCheck = checkCostControl('polli_gen_3d', args, model, estimatedCost, '3d');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.gen3d.blocked');
        }

        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', t('tools.gen3d.generating', { model, resolution }) + argsStr, '🧊 polli_gen_3d');

        context.metadata({ title: `🧊 3D: ${model} (${resolution})` });

        // Effective timeout via hierarchy: per-call > model override > capability > global
        const timeoutSeconds = resolveCapabilityTimeout('gen_3d', model, args.timeout_seconds);
        const timeoutMs = timeoutSeconds * 1000;

        try {
            // Build canonical GET /3d/{prompt}
            const params = new URLSearchParams({
                model,
                resolution,
                seed: String(seed),
                nologo: 'true',
                private: 'true',
            });
            if (args.image) params.set('image', args.image);

            const promptEncoded = encodeURIComponent(prompt);
            const url = `https://gen.pollinations.ai/3d/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {};
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const balBefore = await fetchEnterBalance();

            const result = await httpsGet(url, headers, timeoutMs);
            const glbData = result.data;
            const responseHeaders = result.headers;

            // Artifact validation: GLB magic bytes ('glTF'). Never write a
            // fake format with an arbitrary extension.
            const detected = detectArtifactType(glbData);
            if (!detected || detected.format !== 'glb') {
                return t('tools.gen3d.err_format', {
                    detected: detected ? detected.format : 'unknown',
                });
            }

            // Persist with the detected extension
            let outputDir = getDefaultOutputDir('3d');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;
            if (args.save_to) {
                if (args.save_to.match(/\.glb$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }
            ensureDir(outputDir);
            if (!filename) filename = generateFilename('3d', model, 'glb');

            const persisted = persistArtifact(glbData, {
                outputDir,
                filename,
                preferredExt: 'glb',
                detectExt: true,
            });

            // Real cost via balance delta (ledger sync delay) + headers fallback
            let realCost: number | undefined;
            if (balBefore !== null) {
                await new Promise(r => setTimeout(r, 1000));
                const balAfter = await fetchEnterBalance();
                if (balAfter !== null) {
                    realCost = Math.round((balBefore - balAfter) * 10000) / 10000;
                }
            }
            const costTracking = extractCostFromHeaders(responseHeaders);

            const lines: string[] = [];
            lines.push(t('tools.gen3d.res_title'));
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.gen3d.res_prompt', { prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') }));
            lines.push(t('tools.gen3d.res_model', { model }));
            lines.push(t('tools.gen3d.res_resolution', { resolution }));
            lines.push(t('tools.gen3d.res_seed', { seed }));
            if (args.image) {
                lines.push(t('tools.gen3d.res_image', { src: args.image.substring(0, 60) + '...' }));
            }
            lines.push(t('tools.gen3d.res_file', { path: persisted.filePath }));
            lines.push(t('tools.gen3d.res_size', { size: formatFileSize(persisted.size) }));
            lines.push(t('tools.gen3d.res_format', { ext: persisted.ext.toUpperCase() }));

            if (isCostEstimatorEnabled()) {
                lines.push(t('tools.gen3d.res_cost_est', { cost: formatCost(estimatedCost) }));
                if (realCost !== undefined) {
                    lines.push(t('tools.gen3d.res_cost_real', { cost: formatCost(realCost) }));
                } else if (costTracking.costUsd !== undefined) {
                    lines.push(t('tools.gen3d.res_cost_real', { cost: formatCost(costTracking.costUsd) }));
                }
            }
            if (responseHeaders['x-model-used']) {
                lines.push(t('tools.gen3d.res_model_used', { model: responseHeaders['x-model-used'] }));
            }
            if (responseHeaders['x-request-id']) {
                lines.push(t('tools.gen3d.res_request_id', { id: responseHeaders['x-request-id'] }));
            }

            emitStatusToast('success', t('tools.gen3d.success', { model }), '🧊 gen_3d', { filePath: persisted.filePath });
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.gen3d.err_toast', { error: String(err.message || err).substring(0, 60) }), '🧊 gen_3d');

            const isTimeout = /timeout/i.test(String(err.message || err));

            if (isTimeout) {
                // NO AUTOMATIC RESUBMIT: the generation may still be running
                // and billed upstream. Offer cache recovery with the same seed.
                return t('tools.gen3d.err_timeout', {
                    model,
                    seed,
                    seconds: timeoutSeconds,
                });
            }
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.gen3d.err_pollen');
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return t('tools.gen3d.err_auth');
            }
            return t('tools.gen3d.err_gen', { error: String(err.message || err) });
        }
    },
});
