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
    VIDEO_MODELS,
} from './shared.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const CHEAPEST_MODEL = 'grok-video';
const DEFAULT_DURATION = 3;
const DEFAULT_ASPECT_RATIO = '16:9';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genVideoTool: ToolDefinition = tool({
    description: `Generate a video from a text prompt or image using Pollinations AI.

**🎬 Available Models:**

| Model | T2V | I2V | Audio | Duration | Aspect Ratios | Cost | Gen Time |
|-------|-----|-----|-------|----------|---------------|------|----------|
| grok-video | ✅ | ❌ | ✅ | 1-15s | 16:9, 9:16, 1:1, 4:3 | 0.0025/s | ~10s |
| ltx-2 | ✅ | ❌ | ✅ | 5-20s | 16:9 | 0.01/s | ~35s |
| wan | ❌ | ✅ | ✅ | 5-15s | 16:9, 9:16, 1:1, 4:3 | 0.025/s | ~30s |
| veo | ✅ | ✅ | ✅ | 4-8s | 16:9, 9:16, 1:1 | 0.15/s 💎 | ~45-68s |
| seedance | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens | ~30s |
| seedance-pro | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens | ~30s |

**⚠️ Important Notes:**
- \`wan\` = I2V **ONLY** (Text-to-Video NOT supported!)
- \`veo\` interpolation: Use \`reference_image=url1,url2\` for transitions
- \`ltx-2\` may return 520 intermittently (retry OK)
- \`grok-video\` includes audio generation

**💡 Tips:**
- Start with \`grok-video\` for testing (cheapest: 0.0025/sec)
- Use \`wan\` for image-to-video with native audio
- Use \`veo\` for highest quality (most expensive: 0.15/sec)`,

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
        
        // Get model config
        const modelConfig = VIDEO_MODELS[model];
        if (!modelConfig) {
            return `❌ Modèle inconnu: ${model}
💡 Modèles disponibles: ${Object.keys(VIDEO_MODELS).join(', ')}`;
        }
        
        // Validate duration
        const [minDuration, maxDuration] = getDurationRange(model);
        const duration = args.duration || Math.min(DEFAULT_DURATION, maxDuration);
        
        if (duration < minDuration || duration > maxDuration) {
            return `❌ Durée invalide pour ${model}: ${duration}s
💡 Durée supportée: ${minDuration}-${maxDuration}s`;
        }
        
        // Validate aspect ratio
        if (!validateAspectRatio(model, aspectRatio)) {
            return `❌ Aspect ratio non supporté par ${model}: ${aspectRatio}
💡 Ratios supportés: ${modelConfig.aspectRatios.join(', ')}`;
        }
        
        // Check I2V requirements
        const requiresReferenceImage = requiresI2V(model);
        const supportsReferenceImage = supportsI2V(model);
        
        if (requiresReferenceImage && !args.reference_image) {
            return `❌ Le modèle "${model}" nécessite une image de départ (I2V ONLY).
💡 Ajoutez --reference_image <url>
💡 Pour du T2V, utilisez: grok-video, ltx-2, veo, seedance`;
        }
        
        if (args.reference_image && !supportsReferenceImage) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'I2V.
💡 Modèles I2V: ${Object.entries(VIDEO_MODELS)
    .filter(([, info]) => info.i2v)
    .map(([name]) => name)
    .join(', ')}`;
        }
        
        // Estimate cost
        const estimatedCost = estimateVideoCost(model, duration);

        // Metadata
        context.metadata({ title: `🎬 Video: ${model} (${duration}s)` });

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

            // Video generation takes time (30-70 seconds depending on model)
            const result = await httpsGet(url, headers);
            const videoData = result.data;
            const responseHeaders = result.headers;

            // Save video
            const outputDir = args.save_to || getDefaultOutputDir('videos');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('video', model, 'mp4');
            const filePath = path.join(outputDir, filename.endsWith('.mp4') ? filename : `${filename}.mp4`);

            fs.writeFileSync(filePath, videoData);
            const fileSize = fs.statSync(filePath).size;

            // Extract actual cost from headers
            let actualCost = estimatedCost;
            const costTracking = extractCostFromHeaders(responseHeaders);
            
            if (isCostEstimatorEnabled()) {
                if (costTracking.videoSeconds) {
                    // Calculate from actual seconds
                    const costMatch = modelConfig.cost.match(/[\d.]+/);
                    if (costMatch && modelConfig.costHeader === 'x-usage-completion-video-seconds') {
                        actualCost = costTracking.videoSeconds * parseFloat(costMatch[0]);
                    }
                } else if (costTracking.videoTokens) {
                    // Token-based cost (seedance models)
                    actualCost = costTracking.videoTokens * 0.00001; // Approximate
                }
            }

            // Build result
            const lines: string[] = [
                `🎬 Vidéo Générée`,
                `━━━━━━━━━━━━━━━━━━`,
                `Prompt: ${args.prompt.substring(0, 80)}${args.prompt.length > 80 ? '...' : ''}`,
                `Modèle: ${model}${modelConfig.cost.includes('💎') ? ' 💎' : ''}`,
                `Durée: ~${duration}s`,
                `Aspect: ${aspectRatio}`,
            ];
            
            // Add I2V info if used
            if (args.reference_image) {
                const isInterpolation = model === 'veo' && args.reference_image.includes(',');
                lines.push(`I2V Mode: ${isInterpolation ? 'Interpolation (multi-image)' : 'Single image'}`);
                lines.push(`Source: ${args.reference_image.substring(0, 50)}...`);
            }
            
            // Audio info
            if (modelConfig.audio) {
                lines.push(`Audio: ✅ Généré automatiquement`);
            } else {
                lines.push(`Audio: ❌ Non supporté par ce modèle`);
            }
            
            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);
            lines.push(`Coût estimé: ${formatCost(actualCost)}`);
            
            if (responseHeaders['x-model-used']) {
                lines.push(`Modèle utilisé: ${responseHeaders['x-model-used']}`);
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }
            
            // Gen time estimate
            lines.push(`⏱️ Temps de génération: ${modelConfig.genTime}`);

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.
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
