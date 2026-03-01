/**
 * gen_image Tool - Pollinations Image Generation
 * 
 * Updated: 2026-02-19 - Dynamic ModelRegistry + Cost Guard + Toasts
 * 
 * All models are dynamic from the Pollinations API.
 * Unknown models are accepted as (beta) and passed through to the API.
 * Cost Guard reads enablePaidTools, costConfirmationRequired, costThreshold.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
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
    estimateImageCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    supportsI2I,
    getPaidImageModels,
    fetchEnterBalance,
    sanitizeFilename,
    validateHttpUrl,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'flux';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenImageTool: ToolDefinition = tool({
    description: t('tools.image.desc'),

    args: {
        prompt: tool.schema.string().describe(t('tools.image.arg_prompt')),
        model: tool.schema.string().describe(t('tools.image.arg_model')),
        width: tool.schema.number().min(256).max(4096).optional().describe(t('tools.image.arg_width')),
        height: tool.schema.number().min(256).max(4096).optional().describe(t('tools.image.arg_height')),
        reference_image: tool.schema.string().optional().describe(t('tools.image.arg_ref')),
        seed: tool.schema.number().optional().describe(t('tools.image.arg_seed')),
        quality: tool.schema.enum(['low', 'med', 'high']).optional().describe(t('tools.image.arg_quality')),
        transparent: tool.schema.boolean().optional().describe(t('tools.image.arg_trans')),
        save_to: tool.schema.string().optional().describe(t('tools.image.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.image.arg_filename')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        const hasKey = hasApiKey();

        // Determine model based on key presence
        let model = args.model;
        const width = args.width || 1024;
        const height = args.height || 1024;

        // Fetch known models from registry
        const imageModels = getPaidImageModels();
        const knownModel = !!imageModels[model];
        const isBetaModel = !knownModel;

        // Force Auth Check for ALL Image Generations
        if (!hasKey) {
            return t('tools.image.req_key', { models: Object.keys(imageModels).slice(0, 5).join(', ') });
        }

        // Unknown model → beta passthrough (don't reject)
        if (isBetaModel) {
            emitStatusToast('warning', t('tools.image.unreferenced_model', { model }), '🎨 gen_image');
        }

        // Validate I2I support (for known models only; beta models get default behavior)
        if (args.reference_image) {
            if (!validateHttpUrl(args.reference_image)) {
                return t('tools.image.req_url_i2i') || '❌ URL invalide. Utilisez http:// ou https://';
            }
            if (knownModel && !supportsI2I(model)) {
                const models = Object.entries(imageModels)
                    .filter(([, info]) => info.i2i)
                    .map(([name]) => name)
                    .join(', ');
                return t('tools.image.no_i2i', { model, models });
            }
        }

        // Estimate cost
        const estimatedCost = estimateImageCost(model);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_image', args, model, estimatedCost, 'image');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.image.blocked');
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', t('tools.image.generating', { model, width, height }) + argsStr, '🎨 polli_gen_image');

        // Set metadata
        context.metadata({ title: `🎨 Image: ${model}${isBetaModel ? ' (beta)' : ''}` });

        try {
            let imageData: Buffer;
            let responseHeaders: Record<string, string> = {};
            let usedModel = model;

            // === ENTER endpoint ONLY (gen.pollinations.ai) ===
            const params = new URLSearchParams({
                nologo: 'true',
                private: 'true',
                width: String(width),
                height: String(height),
            });

            // Model parameter
            params.set('model', model);

            // Seed
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            // I2I: reference image(s)
            if (args.reference_image) {
                params.set('image', args.reference_image);
            }

            // Quality (gptimage only)
            if (args.quality && model.startsWith('gptimage')) {
                params.set('quality', args.quality);
            }

            // Transparent (gptimage only)
            if (args.transparent !== undefined && model.startsWith('gptimage')) {
                params.set('transparent', String(args.transparent));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            const url = `https://gen.pollinations.ai/image/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {};
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            // 1. Fetch balance avant génération
            const balBefore = await fetchEnterBalance();

            const result = await httpsGet(url, headers);
            imageData = result.data;
            responseHeaders = result.headers;

            // Update used model from response if available
            if (responseHeaders['x-model-used']) {
                usedModel = responseHeaders['x-model-used'];
            }

            // Save the image
            let outputDir = getDefaultOutputDir('images');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;

            if (args.save_to) {
                if (args.save_to.match(/\.(png|jpe?g|webp|gif)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }

            ensureDir(outputDir);

            filename = filename || generateFilename('image', usedModel, 'png');
            const filePath = path.join(outputDir, filename.includes('.') ? filename : `${filename}.png`);

            fs.writeFileSync(filePath, imageData);
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

            // Extract cost from headers as fallback/info
            const costTracking = extractCostFromHeaders(responseHeaders);

            // Build result
            const fileSize = fs.statSync(filePath).size;
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costCheck.message && !costCheck.allowed) { // Assuming costWarning should come from costCheck if not allowed
                lines.push(costCheck.message);
                lines.push('');
            }

            lines.push(t('tools.image.res_title'));
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.image.res_prompt', { prompt: args.prompt.substring(0, 100) + (args.prompt.length > 100 ? '...' : '') }));
            lines.push(t('tools.image.res_model', { model: `${usedModel}${isBetaModel ? ' (beta)' : ''}` }));
            lines.push(t('tools.image.res_res', { width, height }));

            // Add I2I info if used
            if (args.reference_image) {
                lines.push(t('tools.image.res_i2i_src', { src: args.reference_image.substring(0, 50) + '...' }));
            }

            lines.push(t('tools.image.res_file', { path: filePath }));
            lines.push(t('tools.image.res_size', { size: formatFileSize(fileSize) }));

            // Pricing details (Estimé vs Réel)
            if (isCostEstimatorEnabled()) {
                const maxCost = estimatedCost * 3;
                lines.push(t('tools.image.cost_title'));
                if (isTokenBased('image', usedModel)) {
                    lines.push(`- Cost   : ${formatCost(estimatedCost)} (Max théorique: ${formatCost(maxCost)})`);
                } else {
                    lines.push(t('tools.image.cost_estimated', { cost: formatCost(estimatedCost) }));
                }
                if (realCost !== undefined) {
                    lines.push(t('tools.image.cost_real_wallet', { cost: formatCost(realCost) }));
                } else if (costTracking.costUsd !== undefined) {
                    lines.push(t('tools.image.cost_real_api', { cost: formatCost(costTracking.costUsd) }));
                } else {
                    lines.push(t('tools.image.cost_unknown'));
                }
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', t('tools.image.success', { model: usedModel }), '🎨 gen_image', { filePath: filePath });

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.image.error', { error: err.message?.substring(0, 60) }), '🎨 gen_image');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.image.insufficient_funds', { model });
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return t('tools.image.invalid_key');
            }
            if (err.message?.includes('400')) {
                return t('tools.image.invalid_params', { error: err.message });
            }
            return t('tools.image.gen_error_msg', { error: err.message });
        }
    },
});
