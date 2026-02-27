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
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'flux';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenImageTool: ToolDefinition = tool({
    description: `Generate an image from a text prompt using Pollinations AI.

💡 **Modèles Image Dynamiques** :
L'API Pollinations (Enter) possède une quantité importante de modèles (Flux, Midjourney, Seedream, etc.) et ils changent fréquemment. Le catalogue à jour est listé ci-dessous.

**Exemples d'utilisation Optionnelle** :
- **I2I (Image-to-Image)** : Utilisez le paramètre \`reference_image\` avec une URL ou chemin local si le modèle le supporte.
- L'outil embarque un "costGuard" automatique gérant la confirmation des coûts.`,

    args: {
        prompt: tool.schema.string().describe('Description of the image to generate'),
        model: tool.schema.string().optional().describe('Model to use (default: flux). Unknown models accepted as (beta).'),
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
        let model = args.model || DEFAULT_MODEL;
        const width = args.width || 1024;
        const height = args.height || 1024;

        // Fetch known models from registry
        const imageModels = getPaidImageModels();
        const knownModel = !!imageModels[model];
        const isBetaModel = !knownModel;

        // Force Auth Check for ALL Image Generations
        if (!hasKey) {
            return `❌ **Clé API Requise** pour la génération d'images.
💡 Utilisez \`/pollinations connect <clé>\` pour activer le service.
💎 Modèles disponibles: ${Object.keys(imageModels).slice(0, 5).join(', ')}...`;
        }

        // Unknown model → beta passthrough (don't reject)
        if (isBetaModel) {
            emitStatusToast('warning', `Modèle "${model}" non référencé — mode (beta)`, '🎨 gen_image');
        }

        // Validate I2I support (for known models only; beta models get default behavior)
        if (args.reference_image && knownModel && !supportsI2I(model)) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'Image-to-Image.
💡 Modèles I2I supportés: ${Object.entries(imageModels)
                    .filter(([, info]) => info.i2i)
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Estimate cost
        const estimatedCost = estimateImageCost(model);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_image', args, model, estimatedCost, 'image');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', `Génération image: ${model} (${width}×${height})${argsStr}`, '🎨 polli_gen_image');

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
            let filename = args.filename;

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

            lines.push(`🎨 Image Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt.substring(0, 100)}${args.prompt.length > 100 ? '...' : ''}`);
            lines.push(`Modèle: ${usedModel}${isBetaModel ? ' (beta)' : ''}`);
            lines.push(`Résolution: ${width}×${height}`);

            // Add I2I info if used
            if (args.reference_image) {
                lines.push(`I2I Source: ${args.reference_image.substring(0, 50)}...`);
            }

            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Pricing details (Estimé vs Réel)
            if (isCostEstimatorEnabled()) {
                const maxCost = estimatedCost * 3;
                lines.push(`\n💰 **Rapport Financier :**`);
                if (isTokenBased('image', usedModel)) {
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
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', `Image générée ✓ (${usedModel})`, '🎨 gen_image', { filePath: filePath });

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎨 gen_image');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants pour le modèle "${model}".
💡 Vérifiez votre solde avec /pollinations usage`;
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
