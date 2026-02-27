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
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const CHEAPEST_MODEL = 'grok-video';
const DEFAULT_DURATION = 3;
const DEFAULT_ASPECT_RATIO = '16:9';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenVideoTool: ToolDefinition = tool({
    description: `Generate a video from a text prompt or image using Pollinations AI.

💡 **Modèles Vidéo Dynamiques** :
L'API vidéo Pollinations évolue constamment. Les modèles disponibles (T2V/I2V), leurs limites de durée, options d'aspect ratios et tarifs (tokens ou USD) sont injectés ci-dessous en temps réel.

**Exemples d'options communes** :
- \`veo\` interpolation: Utilisez \`reference_image=url1,url2\` pour les transitions.
- L'outil gérera le "costGuard" si l'utilisateur doit confirmer.`,

    args: {
        prompt: tool.schema.string().describe('Description of the video to generate'),
        model: tool.schema.string().optional().describe(`Video model (default: ${CHEAPEST_MODEL})`),
        duration: tool.schema.number().min(1).max(20).optional().describe('Duration in seconds (default: 3, varies by model)'),
        aspect_ratio: tool.schema.enum(['16:9', '9:16', '1:1', '4:3']).optional().describe('Aspect ratio (default: 16:9, varies by model)'),
        reference_image: tool.schema.string().optional().describe('URL for I2V (required for wan) or comma-separated URLs for veo interpolation'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La génération vidéo nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = args.model || CHEAPEST_MODEL;
        const aspectRatio = args.aspect_ratio || DEFAULT_ASPECT_RATIO;

        // Get model config from dynamic registry
        const videoModels = getVideoModels();
        const modelConfig = videoModels[model];
        const isBetaModel = !modelConfig;

        if (isBetaModel) {
            emitStatusToast('warning', `Modèle "${model}" non référencé — mode (beta)`, '🎬 gen_video');
        }

        // Validate duration (for known models; beta models use defaults)
        const [minDuration, maxDuration] = isBetaModel ? [1, 20] : getDurationRange(model);
        const duration = args.duration || Math.min(DEFAULT_DURATION, maxDuration);

        if (duration < minDuration || duration > maxDuration) {
            return `❌ Durée invalide pour ${model}: ${duration}s
💡 Durée supportée: ${minDuration}-${maxDuration}s`;
        }

        // Validate aspect ratio (for known models; beta models accept any)
        if (!isBetaModel && !validateAspectRatio(model, aspectRatio)) {
            return `❌ Aspect ratio non supporté par ${model}: ${aspectRatio}
💡 Ratios supportés: ${modelConfig!.aspectRatios.join(', ')}`;
        }

        // Check I2V requirements
        const requiresReferenceImage = !isBetaModel && requiresI2V(model);
        const supportsReferenceImage = isBetaModel || supportsI2V(model);

        if (requiresReferenceImage && !args.reference_image) {
            return `❌ Le modèle "${model}" nécessite une image de départ (I2V ONLY).
💡 Ajoutez --reference_image <url>
💡 Pour du T2V, utilisez: grok-video, ltx-2, veo, seedance`;
        }

        if (args.reference_image && !supportsReferenceImage) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'I2V.
💡 Modèles I2V: ${Object.entries(videoModels)
                    .filter(([, info]) => info.i2v)
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Estimate cost
        const estimatedCost = estimateVideoCost(model, duration);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_video', args, model, estimatedCost, 'video');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', `Génération vidéo: ${model} (${duration}s)${argsStr}`, '🎬 polli_gen_video');

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
            const url = `https://gen.pollinations.ai/image/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`,
            };

            // 1. Fetch balance avant génération
            const balBefore = await fetchEnterBalance();

            // Video generation takes time (30-70 seconds depending on model)
            const result = await httpsGet(url, headers);
            const videoData = result.data;
            const responseHeaders = result.headers;

            // Save video
            let outputDir = getDefaultOutputDir('videos');
            let filename = args.filename;

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

            lines.push(`🎬 Vidéo Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt.substring(0, 80)}${args.prompt.length > 80 ? '...' : ''}`);
            lines.push(`Modèle: ${model}${isBetaModel ? ' (beta)' : ''}${modelConfig?.cost?.includes('💎') ? ' 💎' : ''}`);
            lines.push(`Durée: ~${duration}s`);
            lines.push(`Aspect: ${aspectRatio}`);

            // Add I2V info if used
            if (args.reference_image) {
                const isInterpolation = model === 'veo' && args.reference_image.includes(',');
                lines.push(`I2V Mode: ${isInterpolation ? 'Interpolation (multi-image)' : 'Single image'}`);
                lines.push(`Source: ${args.reference_image.substring(0, 50)}...`);
            }

            // Audio info (known models only)
            if (modelConfig?.audio) {
                lines.push(`Audio: ✅ Généré automatiquement`);
            } else if (!isBetaModel) {
                lines.push(`Audio: ❌ Non supporté par ce modèle`);
            }

            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Pricing details (Estimé vs Réel)
            if (isCostEstimatorEnabled()) {
                const maxCost = estimatedCost * 3;
                lines.push(`\n💰 **Rapport Financier :**`);
                if (isTokenBased('video', model)) {
                    lines.push(`- Coût Estimé   : ${formatCost(estimatedCost)} (Max théorique: ${formatCost(maxCost)})`);
                } else {
                    lines.push(`- Coût Estimé   : ${formatCost(estimatedCost)}`);
                }
                if (realCost !== undefined) {
                    lines.push(`- Coût Réel     : **${formatCost(realCost)}** (via Solde Wallet)`);
                } else if (costTracking.costUsd !== undefined) {
                    lines.push(`- Coût Réel     : **${formatCost(costTracking.costUsd)}** (via Headers API)`);
                } else {
                    lines.push(`- Coût Réel     : Inconnu (API injoignable)`);
                }
            }

            if (responseHeaders['x-model-used']) {
                lines.push(`Modèle utilisé: ${responseHeaders['x-model-used']}`);
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Gen time estimate (known models only)
            if (modelConfig?.genTime) {
                lines.push(`⏱️ Temps de génération: ${modelConfig.genTime}`);
            }

            // Emit success toast
            emitStatusToast('success', `Vidéo générée ✓ (${model}, ${duration}s)`, '🎬 gen_video');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎬 gen_video');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.
💡 Essayez \`grok-video\` (le moins cher: 0.0025/sec)`;
            }
            if (err.message?.includes('400')) {
                if (requiresI2V(model) && !args.reference_image) {
                    return `❌ Le modèle "${model}" est I2V ONLY.
💡 Ajoutez --reference_image <url>`;
                }
                return `❌ Paramètres invalides: ${err.message}`;
            }
            if (err.message?.includes('520') && model === 'ltx-2') {
                return `⚠️ LTX-2 a retourné une erreur 520 (intermittent).
💡 Réessayez dans quelques secondes.`;
            }
            if (err.message?.includes('Timeout')) {
                return `❌ Timeout - La génération vidéo a pris trop de temps.
💡 Réessayez avec une durée plus courte.`;
            }
            return `❌ Erreur génération vidéo: ${err.message}`;
        }
    },
});
