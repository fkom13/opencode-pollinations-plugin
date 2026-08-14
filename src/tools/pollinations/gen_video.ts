/**
 * gen_video Tool - Pollinations Video Generation
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Video models with different capabilities:
 * - T2V (Text-to-Video): grok-video, ltx-2, veo, seedance, seedance-pro
 * - I2V (Image-to-Video): wan (I2V ONLY!), veo, seedance, seedance-pro
 * - Veo Interpolation: Uses image=url1,url2 for transitions
 * 
 * Response headers for cost tracking:
 * - x-usage-completion-video-seconds (grok, ltx-2, veo, wan)
 * - x-usage-completion-video-tokens (seedance, seedance-pro)
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateVideoCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    supportsI2V,
    requiresI2V,
    validateAspectRatio,
    getDurationRange,
    getVideoModels,
    fetchEnterBalance,
    sanitizeFilename,
    validateHttpUrl,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { validateTimeoutSeconds } from './timeout-policy.js';
import { resolveCapabilityTimeout } from './tool-capability-registry.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const CHEAPEST_MODEL = 'grok-video';
const DEFAULT_DURATION = 3;
const DEFAULT_ASPECT_RATIO = '16:9';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenVideoTool: ToolDefinition = tool({
    description: t('tools.polli_gen_video.desc'),

    args: {
        prompt: tool.schema.string().describe(t('tools.polli_gen_video.arg_prompt')),
        model: tool.schema.string().describe(t('tools.polli_gen_video.arg_model', { model: CHEAPEST_MODEL })),
        duration: tool.schema.number().optional().describe(t('tools.polli_gen_video.arg_duration')),
        aspect_ratio: tool.schema.enum(['16:9', '9:16', '1:1', '4:3']).optional().describe(t('tools.polli_gen_video.arg_aspect')),
        reference_image: tool.schema.string().optional().describe(t('tools.polli_gen_video.arg_ref')),
        seed: tool.schema.number().optional().describe(t('tools.polli_gen_video.arg_seed')),
        timeout_seconds: tool.schema.number().optional().describe(t('tools.polli_gen_video.arg_timeout')),
        save_to: tool.schema.string().optional().describe(t('tools.polli_gen_video.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.polli_gen_video.arg_filename')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_gen_video.req_key');
        }

        const model = args.model;
        const aspectRatio = args.aspect_ratio || DEFAULT_ASPECT_RATIO;

        // Get model config from dynamic registry
        const videoModels = getVideoModels();
        const modelConfig = videoModels[model];
        const isBetaModel = !modelConfig;

        if (isBetaModel) {
            emitStatusToast('warning', t('tools.polli_gen_video.warn_beta', { model }), '🎬 gen_video');
        }

        // Validate duration (for known models; beta models use defaults)
        const [minDuration, maxDuration] = isBetaModel ? [1, 20] : getDurationRange(model);
        const duration = args.duration || Math.min(DEFAULT_DURATION, maxDuration);

        if (duration < minDuration || duration > maxDuration) {
            return t('tools.polli_gen_video.invalid_duration', { model, duration, min: minDuration, max: maxDuration });
        }

        // Validate aspect ratio (for known models; beta models accept any)
        if (!isBetaModel && !modelConfig!.aspectRatios.includes(aspectRatio)) {
            return t('tools.polli_gen_video.invalid_aspect', { model, aspect: aspectRatio, supported: modelConfig!.aspectRatios.join(', ') });
        }

        // Check I2V requirements & validation
        if (args.reference_image) {
            const urls = args.reference_image.split(',').map(u => u.trim());
            for (const u of urls) {
                if (!validateHttpUrl(u)) {
                    return '❌ URL invalide. Utilisez http:// ou https://';
                }
            }
        }

        const requiresReferenceImage = !isBetaModel && requiresI2V(model);
        const supportsReferenceImage = isBetaModel || supportsI2V(model);

        if (requiresReferenceImage && !args.reference_image) {
            return t('tools.polli_gen_video.req_i2v', { model });
        }

        if (args.reference_image && !supportsReferenceImage) {
            const models = Object.entries(videoModels)
                .filter(([, info]) => info.i2v)
                .map(([name]) => name)
                .join(', ');
            return t('tools.polli_gen_video.no_i2v', { model, models });
        }

        // Per-call timeout validation (v6.5: >= 10s, <= 3600s, no auto resubmit)
        const timeoutCheck = validateTimeoutSeconds(args.timeout_seconds);
        if (!timeoutCheck.ok) {
            return t('tools.polli_gen_video.invalid_timeout', { reason: timeoutCheck.reason || '' });
        }

        // Estimate cost
        const estimatedCost = estimateVideoCost(model, duration);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_video', args, model, estimatedCost, 'video');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.polli_gen_video.blocked');
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', t('tools.polli_gen_video.toast_start', { model, duration }) + argsStr, '🎬 polli_gen_video');

        // Metadata
        context.metadata({ title: `🎬 Video: ${model}${isBetaModel ? ' (beta)' : ''} (${duration}s)` });

        try {
            // Build URL
            const params = new URLSearchParams({
                model: model,
                nologo: 'true',
                private: 'true',
            });

            // Duration parameter
            params.set('duration', String(duration));

            // Aspect ratio - convert to width/height for API
            const aspectToSize: Record<string, { w: number; h: number }> = {
                '16:9': { w: 1920, h: 1080 },
                '9:16': { w: 1080, h: 1920 },
                '1:1': { w: 1024, h: 1024 },
                '4:3': { w: 1440, h: 1080 },
            };
            const size = aspectToSize[aspectRatio] || aspectToSize['16:9'];
            params.set('width', String(size.w));
            params.set('height', String(size.h));

            // I2V: reference image(s)
            if (args.reference_image) {
                // Veo interpolation: comma-separated URLs
                // Other I2V models: single URL
                params.set('image', args.reference_image);
            }

            // Seed for reproducibility
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            // v6.5: /video/{prompt} is the canonical route (SDK/CLI). /image/{prompt}
            // remains compatible upstream but the plugin follows the semantic route.
            const url = `https://gen.pollinations.ai/video/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`,
            };

            // 1. Fetch balance avant génération
            const balBefore = await fetchEnterBalance();

            // Video generation takes time (30-70 seconds depending on model)
            const timeoutSeconds = resolveCapabilityTimeout('gen_video', model, args.timeout_seconds, config.timeouts ?? null);
            const result = await httpsGet(url, headers, timeoutSeconds * 1000);
            const videoData = result.data;
            const responseHeaders = result.headers;

            // Save video
            let outputDir = getDefaultOutputDir('videos');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;

            if (args.save_to) {
                if (args.save_to.match(/\.(mp4|webm|mov|avi)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }

            ensureDir(outputDir);

            filename = filename || generateFilename('video', model, 'mp4');
            const filePath = path.join(outputDir, filename.endsWith('.mp4') ? filename : `${filename}.mp4`);

            fs.writeFileSync(filePath, videoData);
            const fileSize = fs.statSync(filePath).size;

            // Extract actual cost from headers as fallback
            const costTracking = extractCostFromHeaders(responseHeaders);

            // 2. Fetch balance après génération (delay for API sync)
            let balAfter: number | null = null;
            let realCost: number | undefined;
            if (balBefore !== null) {
                await new Promise(r => setTimeout(r, 1000)); // Laisse le temps au ledger
                balAfter = await fetchEnterBalance();
                if (balAfter !== null) {
                    realCost = Math.round((balBefore - balAfter) * 10000) / 10000;
                }
            }

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costCheck.message && !costCheck.allowed) { // Assuming costWarning should come from costCheck if not allowed
                lines.push(costCheck.message);
                lines.push('');
            }

            lines.push(t('tools.polli_gen_video.res_title'));
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.polli_gen_video.res_prompt', { prompt: args.prompt.substring(0, 80) + (args.prompt.length > 80 ? '...' : '') }));
            lines.push(t('tools.polli_gen_video.res_model', { model: `${model}${isBetaModel ? ' (beta)' : ''}${modelConfig?.cost?.includes('💎') ? ' 💎' : ''}` }));
            lines.push(t('tools.polli_gen_video.res_duration', { duration }));
            lines.push(t('tools.polli_gen_video.res_aspect', { aspect: aspectRatio }));

            // Add I2V info if used
            if (args.reference_image) {
                const isInterpolation = model === 'veo' && args.reference_image.includes(',');
                lines.push(t('tools.polli_gen_video.res_i2v_mode', { mode: isInterpolation ? t('tools.polli_gen_video.res_i2v_interp') : t('tools.polli_gen_video.res_i2v_single') }));
                lines.push(t('tools.polli_gen_video.res_source', { url: args.reference_image.substring(0, 50) + '...' }));
            }

            // Audio info (known models only)
            if (modelConfig?.audio) {
                lines.push(t('tools.polli_gen_video.res_audio_ok'));
            } else if (!isBetaModel) {
                lines.push(t('tools.polli_gen_video.res_audio_no'));
            }

            lines.push(t('tools.polli_gen_video.res_file', { path: filePath }));
            lines.push(t('tools.polli_gen_video.res_size', { size: formatFileSize(fileSize) }));

            // Pricing details (Estimé vs Réel)
            if (isCostEstimatorEnabled()) {
                const maxCost = estimatedCost * 3;
                lines.push(t('tools.polli_gen_video.res_cost_title'));
                if (isTokenBased('video', model)) {
                    lines.push(t('tools.polli_gen_video.res_cost_est_tok', { cost: formatCost(estimatedCost), maxCost: formatCost(maxCost) }));
                } else {
                    lines.push(t('tools.polli_gen_video.res_cost_est', { cost: formatCost(estimatedCost) }));
                }
                if (realCost !== undefined) {
                    lines.push(t('tools.polli_gen_video.res_cost_real_wallet', { cost: formatCost(realCost) }));
                } else if (costTracking.costUsd !== undefined) {
                    lines.push(t('tools.polli_gen_video.res_cost_real_headers', { cost: formatCost(costTracking.costUsd) }));
                } else {
                    lines.push(t('tools.polli_gen_video.res_cost_real_unknown'));
                }
            }

            if (responseHeaders['x-model-used']) {
                lines.push(t('tools.polli_gen_video.res_model_used', { model: responseHeaders['x-model-used'] }));
            }
            if (responseHeaders['x-request-id']) {
                lines.push(t('tools.polli_gen_video.res_request_id', { id: responseHeaders['x-request-id'] }));
            }

            // Gen time estimate (known models only)
            if (modelConfig?.genTime) {
                lines.push(t('tools.polli_gen_video.res_time', { time: modelConfig.genTime }));
            }

            // Emit success toast
            emitStatusToast('success', t('tools.polli_gen_video.toast_success', { model, duration }), '🎬 gen_video');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.polli_gen_video.toast_err', { error: err.message?.substring(0, 60) }), '🎬 gen_video');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.polli_gen_video.err_pollen');
            }
            if (err.message?.includes('400')) {
                if (requiresI2V(model) && !args.reference_image) {
                    return t('tools.polli_gen_video.err_i2v_req', { model });
                }
                return t('tools.polli_gen_video.err_invalid', { msg: err.message });
            }
            if (err.message?.includes('520') && model === 'ltx-2') {
                return t('tools.polli_gen_video.err_520');
            }
            if (err.message?.includes('Timeout')) {
                return t('tools.polli_gen_video.err_timeout');
            }
            return t('tools.polli_gen_video.err_gen', { error: err.message });
        }
    },
});
