/**
 * gen_music Tool - Pollinations Music Generation
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Model: elevenmusic (ElevenLabs Music)
 * Endpoint: gen.pollinations.ai/audio/{text}
 * 
 * Parameters:
 * - duration: 3-300 seconds
 * - instrumental: boolean (vocals or instrumental only)
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
    estimateMusicCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const MIN_DURATION = 3;
const MAX_DURATION = 300; // 5 minutes
const DEFAULT_DURATION = 10;
const MODEL_NAME = 'elevenmusic';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenMusicTool: ToolDefinition = tool({
    description: `Generate music from a text description using Pollinations AI.

**🎵 Model:** elevenmusic (ElevenLabs Music)

**📝 Parameters:**
- \`duration\`: 3-300 seconds (default: 10s)
- \`instrumental\`: true = no vocals, false = vocals allowed

**💡 Example Prompts:**
- "upbeat jazz with saxophone solo"
- "ambient electronic for meditation"
- "epic orchestral film score with dramatic strings"
- "lo-fi hip hop beats with piano"
- "acoustic guitar ballad with soft vocals"
- "electronic dance music with heavy bass drop"

**💰 Cost:** ~0.005 🌻 per second
- 10 seconds ≈ 0.05 🌻
- 30 seconds ≈ 0.15 🌻
- 60 seconds ≈ 0.30 🌻

**⚠️ Notes:**
- Generation time scales with duration (~1s per second of audio)
- Longer tracks (60s+) may take 1-2 minutes
- Instrumental mode produces cleaner results for background music`,

    args: {
        prompt: tool.schema.string().describe('Description of the music to generate'),
        duration: tool.schema.number().min(MIN_DURATION).max(MAX_DURATION).optional()
            .describe(`Duration in seconds (default: ${DEFAULT_DURATION}, max: ${MAX_DURATION})`),
        instrumental: tool.schema.boolean().optional().describe('Instrumental only - no vocals (default: false)'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La génération musicale nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const duration = Math.min(args.duration || DEFAULT_DURATION, MAX_DURATION);
        const instrumental = args.instrumental || false;

        // Estimate cost
        const estimatedCost = estimateMusicCost(duration);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_music', args, MODEL_NAME, estimatedCost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }

        // Estimate generation time
        const genTimeSeconds = Math.ceil(duration * 1.2);

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', `Génération musique: ${duration}s (~${genTimeSeconds}s gen)${argsStr}`, '🎵 polli_gen_music');

        // Metadata
        context.metadata({ title: `🎵 Music: ${duration}s (~${genTimeSeconds}s gen time)` });

        try {
            // Build URL
            const params = new URLSearchParams({
                model: MODEL_NAME,
                nologo: 'true',
                private: 'true',
                duration: String(duration),
            });

            if (instrumental) {
                params.set('instrumental', 'true');
            }

            // Seed for reproducibility
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            const url = `https://gen.pollinations.ai/audio/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`,
            };

            // Music generation takes time
            const result = await httpsGet(url, headers);
            const audioData = result.data;
            const responseHeaders = result.headers;

            // Save audio
            let outputDir = getDefaultOutputDir('music');
            let filename = args.filename;

            if (args.save_to) {
                if (args.save_to.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }

            ensureDir(outputDir);

            filename = filename || generateFilename('music', MODEL_NAME, 'mp3');
            const filePath = path.join(outputDir, filename.endsWith('.mp3') ? filename : `${filename}.mp3`);

            fs.writeFileSync(filePath, audioData);
            const fileSize = fs.statSync(filePath).size;

            let actualCost = estimatedCost;
            if (responseHeaders) {
                const costTracking = extractCostFromHeaders(responseHeaders);
                if (costTracking.costUsd !== undefined) actualCost = costTracking.costUsd;
            }

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costCheck.message && !costCheck.allowed) {
                lines.push(costCheck.message);
                lines.push('');
            }

            lines.push(`🎵 Musique Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt}`);
            lines.push(`Durée: ~${duration}s`);
            lines.push(`Mode: ${instrumental ? 'Instrumental (sans voix)' : 'Avec voix possible'}`);
            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Cost info
            if (isCostEstimatorEnabled()) {
                if (isTokenBased('audio', MODEL_NAME)) {
                    const maxCost = estimatedCost * 3;
                    lines.push(`Coût: ${formatCost(actualCost)} (Max théorique: ${formatCost(maxCost)})`);
                } else {
                    lines.push(`Coût: ${formatCost(actualCost)}`);
                }
            }

            if (responseHeaders['x-model-used']) {
                lines.push(`Modèle utilisé: ${responseHeaders['x-model-used']}`);
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', `Musique générée ✓ (${duration}s)`, '🎵 gen_music');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎵 gen_music');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            if (err.message?.includes('Timeout')) {
                return `❌ Timeout - La génération musicale a pris trop de temps.
💡 Essayez une durée plus courte.`;
            }
            return `❌ Erreur génération musicale: ${err.message}`;
        }
    },
});
