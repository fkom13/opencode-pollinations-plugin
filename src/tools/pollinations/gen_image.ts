/**
 * gen_image Tool - Pollinations Image Generation
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Supports:
 * - FREE models: sana, zimage (flux REMOVED, turbo BROKEN)
 * - ENTER models: flux, kontext, seedream, klein, gptimage, imagen-4, etc.
 * - Image-to-Image (I2I): klein, klein-large, kontext, seedream, seedream-pro, nanobanana, nanobanana-pro
 * - Multi-image I2I: seedream-pro (comma-separated URLs)
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
    FREE_IMAGE_MODELS,
    PAID_IMAGE_MODELS,
} from './shared.js';

// ─── Constants ─────────────────────────────────────────────────────────────

/** 
 * FREE models that work reliably (2026-02-12)
 * WARNING: flux removed from free, turbo shows deprecated notice
 */
const RELIABLE_FREE_MODELS = ['sana', 'zimage'];

const DEFAULT_MODEL = 'flux';
const FREE_DEFAULT_MODEL = 'sana';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genImageTool: ToolDefinition = tool({
    description: `Generate an image from a text prompt using Pollinations AI.

**🆓 FREE Models** (no API key, no cost):
- \`sana\`: Default free model (~60KB, reliable)
- \`zimage\`: Low quality alias (~35KB)
- ⚠️ \`turbo\`: BROKEN - shows deprecated notice
- ⚠️ \`flux\`: REMOVED from free tier!

**💎 ENTER Models** (requires API key):
| Model | Cost | T2I | I2I | Notes |
|-------|------|-----|-----|-------|
| flux | 0.0002 🌻 | ✅ | ❌ | Fast high-quality |
| zimage | 0.0002 🌻 | ✅ | ❌ | 6B Flux with 2x upscaling |
| imagen-4 | 0.0025 🌻 | ✅ | ❌ | Google high fidelity |
| klein | 0.008 🌻 | ✅ | ✅ | FLUX.2 Klein 4B |
| klein-large | 0.012 🌻 | ✅ | ✅ | FLUX.2 Klein 9B |
| kontext | 0.04 🌻 | ✅ | ✅ | In-Context Editing |
| seedream | 0.03 🌻 | ✅ | ✅ | ByteDance ARK quality |
| seedream-pro | 0.04 🌻 | ✅ | ✅ | 4K, Multi-Image support |
| gptimage | tokens | ✅ | ❌ | OpenAI GPT Image Mini |
| gptimage-large | tokens | ✅ | ❌ | OpenAI GPT Image 1.5 |
| nanobanana | tokens | ✅ | ✅ | Gemini 2.5 Flash |
| nanobanana-pro | tokens | ✅ | ✅ | Gemini 3 Pro Thinking |

**🖼️ Image-to-Image (I2I)**:
Models with I2I support can transform existing images.
- Use \`reference_image\` parameter with URL or local path
- \`seedream-pro\` supports multiple images (comma-separated URLs)
- \`kontext\` specializes in in-context editing

**⚙️ Per-Model Parameters**:
- \`width/height\`: All models (default: 1024x1024)
- \`quality\`: gptimage only (low/med/high)
- \`transparent\`: gptimage only (true/false)
- \`seed\`: Reproducibility (-1 for random)`,

    args: {
        prompt: tool.schema.string().describe('Description of the image to generate'),
        model: tool.schema.string().optional().describe('Model to use (default: flux or sana if no key)'),
        width: tool.schema.number().min(256).max(4096).optional().describe('Image width (default: 1024)'),
        height: tool.schema.number().min(256).max(4096).optional().describe('Image height (default: 1024)'),
        reference_image: tool.schema.string().optional().describe('URL(s) for image-to-image editing (comma-separated for multi-image models)'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        quality: tool.schema.enum(['low', 'med', 'high']).optional().describe('Quality for gptimage models only'),
        transparent: tool.schema.boolean().optional().describe('Transparent background for gptimage models only'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        const hasKey = hasApiKey();
        
        // Determine model based on key presence
        let model = args.model || (hasKey ? DEFAULT_MODEL : FREE_DEFAULT_MODEL);
        const width = args.width || 1024;
        const height = args.height || 1024;
        
        // Check if it's a free model
        const isFreeModel = Object.keys(FREE_IMAGE_MODELS).includes(model);
        const isReliableFree = RELIABLE_FREE_MODELS.includes(model);
        
        // Check if it's a paid model
        const paidModelInfo = PAID_IMAGE_MODELS[model];
        const isPaidModel = !!paidModelInfo;
        
        // Validate model selection
        if (isFreeModel && !isReliableFree) {
            return `⚠️ Le modèle "${model}" n'est plus fiable.
${model === 'turbo' ? '`turbo` affiche une notice de dépréciation.' : ''}
💡 Modèles gratuits recommandés: ${RELIABLE_FREE_MODELS.join(', ')}
${hasKey ? `💎 Ou utilisez un modèle payant: flux, kontext, seedream...` : ''}`;
        }
        
        if (isPaidModel && !hasKey) {
            return `❌ Le modèle "${model}" nécessite une clé API.
💡 Utilisez un modèle gratuit: ${RELIABLE_FREE_MODELS.join(', ')}
🔧 Ou connectez votre clé avec /pollinations connect`;
        }
        
        // Validate I2I support
        if (args.reference_image && isPaidModel && !supportsI2I(model)) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'Image-to-Image.
💡 Modèles I2I supportés: ${Object.entries(PAID_IMAGE_MODELS)
    .filter(([, info]) => info.i2i)
    .map(([name]) => name)
    .join(', ')}`;
        }
        
        // Check if model exists
        if (!isFreeModel && !isPaidModel) {
            return `❌ Modèle inconnu: ${model}
💡 Modèles gratuits: ${RELIABLE_FREE_MODELS.join(', ')}
💎 Modèles payants: ${Object.keys(PAID_IMAGE_MODELS).slice(0, 5).join(', ')}...`;
        }
        
        // Estimate cost
        const estimatedCost = isPaidModel ? estimateImageCost(model) : 0;
        
        // Set metadata
        context.metadata({ title: `🎨 Image: ${model}` });

        try {
            let imageData: Buffer;
            let responseHeaders: Record<string, string> = {};
            let usedModel = model;

            if (isFreeModel && !hasKey) {
                // === FREE endpoint (image.pollinations.ai) ===
                const params = new URLSearchParams({
                    nologo: 'true',
                    private: 'true',
                });
                
                if (model !== 'sana') {
                    params.set('model', model);
                }
                
                if (args.seed !== undefined) {
                    params.set('seed', String(args.seed));
                }

                const promptEncoded = encodeURIComponent(args.prompt);
                const url = `https://image.pollinations.ai/${promptEncoded}?${params}`;

                const result = await httpsGet(url);
                imageData = result.data;
                
            } else {
                // === ENTER endpoint (gen.pollinations.ai) ===
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
                    // Check if it's a local file path
                    let imageUrl = args.reference_image;
                    if (!args.reference_image.startsWith('http')) {
                        // For local files, we'd need to upload first
                        // For now, require URL
                        return `❌ Les fichiers locaux nécessitent d'être uploadés d'abord.
💡 Utilisez l'outil \`file_to_url\` pour obtenir une URL publique.`;
                    }
                    params.set('image', imageUrl);
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

                const result = await httpsGet(url, headers);
                imageData = result.data;
                responseHeaders = result.headers;
                
                // Update used model from response if available
                if (responseHeaders['x-model-used']) {
                    usedModel = responseHeaders['x-model-used'];
                }
            }

            // Save the image
            const outputDir = args.save_to || getDefaultOutputDir('images');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('image', usedModel, 'png');
            const filePath = path.join(outputDir, filename.endsWith('.png') ? filename : `${filename}.png`);

            fs.writeFileSync(filePath, imageData);
            const fileSize = fs.statSync(filePath).size;

            // Extract actual cost from headers if available
            let actualCost = estimatedCost;
            if (isCostEstimatorEnabled() && responseHeaders['x-usage-completion-image-tokens']) {
                const tokens = parseFloat(responseHeaders['x-usage-completion-image-tokens']);
                // Token-based cost calculation would go here
            }

            // Build result
            const lines: string[] = [
                `🎨 Image Générée`,
                `━━━━━━━━━━━━━━━━━━`,
                `Prompt: ${args.prompt.substring(0, 100)}${args.prompt.length > 100 ? '...' : ''}`,
                `Modèle: ${usedModel}${isFreeModel ? ' (GRATUIT)' : ''}`,
                `Résolution: ${width}×${height}`,
            ];
            
            // Add I2I info if used
            if (args.reference_image) {
                lines.push(`I2I Source: ${args.reference_image.substring(0, 50)}...`);
            }
            
            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);
            
            // Cost info
            if (isFreeModel) {
                lines.push(`Coût: GRATUIT`);
            } else {
                lines.push(`Coût estimé: ${formatCost(actualCost)}`);
                if (responseHeaders['x-request-id']) {
                    lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
                }
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants pour le modèle "${model}".
💡 Essayez un modèle gratuit: ${RELIABLE_FREE_MODELS.join(', ')}`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.
🔧 Vérifiez votre clé avec /pollinations connect`;
            }
            if (err.message?.includes('400')) {
                return `❌ Paramètres invalides: ${err.message}
💡 Vérifiez que le modèle supporte les paramètres fournis.`;
            }
            return `❌ Erreur génération image: ${err.message}`;
        }
    },
});
