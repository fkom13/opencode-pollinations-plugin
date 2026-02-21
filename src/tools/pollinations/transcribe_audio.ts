/**
 * transcribe_audio Tool - Pollinations Speech-to-Text (STT)
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * 1. whisper-large-v3 (DEFAULT): High accuracy Whisper model
 * 2. whisper-1: Standard Whisper model
 * 3. scribe: ElevenLabs Scribe v2
 * 
 * All models use /v1/audio/transcriptions (POST multipart)
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsPost,
    httpsPostMultipart,
    ensureDir,
    formatFileSize,
    getAudioModels,
} from './shared.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'whisper-large-v3';
const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'mpeg', 'mpga', 'ogg'];

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliSttTool: ToolDefinition = tool({
    description: `Transcribe audio to text using Pollinations AI.

**🎙️ Models:**

| Model | Supplier | Notes |
|-------|----------|-------|
| whisper-large-v3 | OpenAI | **DEFAULT** - High accuracy, long audio |
| whisper-1 | OpenAI | Standard accuracy |
| scribe | ElevenLabs | Scribe v2 model |

**📁 Supported Formats:**
mp3, wav, m4a, webm, mp4, mpeg, mpga, ogg

**💡 Tips:**
- Use \`whisper-large-v3\` for the highest accuracy on long recordings
- Supports both local files and URLs

**📋 Output:**
- Returns transcribed text
- Includes detected language (if available)
- Shows processing time`,

    args: {
        file: tool.schema.string().describe('Path to audio file or URL to transcribe'),
        model: tool.schema.string().optional().describe(`STT model (default: ${DEFAULT_MODEL})`),
        language: tool.schema.string().optional().describe('Language hint (e.g., "en", "fr", "es")'),
        save_transcript: tool.schema.boolean().optional().describe('Save transcript to file (default: false)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La transcription nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = args.model || DEFAULT_MODEL;

        // Validate model
        const audioModels = getAudioModels();
        const modelInfo = audioModels[model];
        if (!modelInfo || (modelInfo.type !== 'stt' && modelInfo.type !== 'both')) {
            return `❌ Modèle STT inconnu: ${model}
💡 Modèles STT disponibles: ${Object.entries(audioModels)
                    .filter(([, info]) => info.type === 'stt' || info.type === 'both')
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Check file
        let audioPath = args.file;
        let audioBuffer: Buffer;
        let fileName = 'audio.mp3';

        if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
            // Download from URL
            context.metadata({ title: `🎙️ STT: Downloading...` });

            try {
                const https = await import('https');
                const http = await import('http');
                const protocol = audioPath.startsWith('https') ? https : http;

                audioBuffer = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    protocol.get(audioPath, (res) => {
                        if (res.statusCode === 301 || res.statusCode === 302) {
                            // Follow redirect
                            const redirectUrl = res.headers.location;
                            if (redirectUrl) {
                                const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
                                redirectProtocol.get(redirectUrl, (res2) => {
                                    res2.on('data', chunk => chunks.push(chunk));
                                    res2.on('end', () => resolve(Buffer.concat(chunks)));
                                    res2.on('error', reject);
                                }).on('error', reject);
                                return;
                            }
                        }
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });

                // Extract filename from URL
                try {
                    const urlPath = new URL(audioPath).pathname;
                    fileName = path.basename(urlPath) || 'audio.mp3';
                } catch {
                    fileName = 'audio.mp3';
                }

            } catch (err: any) {
                return `❌ Impossible de télécharger l'audio: ${err.message}`;
            }

        } else {
            // Local file
            if (!fs.existsSync(audioPath)) {
                return `❌ Fichier non trouvé: ${audioPath}`;
            }

            // Check format
            const ext = path.extname(audioPath).toLowerCase().replace('.', '');
            if (!SUPPORTED_FORMATS.includes(ext)) {
                return `⚠️ Format non supporté: .${ext}
💡 Formats supportés: ${SUPPORTED_FORMATS.join(', ')}`;
            }

            audioBuffer = fs.readFileSync(audioPath);
            fileName = path.basename(audioPath);
        }

        const fileSize = audioBuffer.length;

        // Metadata
        context.metadata({ title: `🎙️ STT: ${model} (${formatFileSize(fileSize)})` });

        try {
            let transcript = '';
            let detectedLanguage = '';

            // === All STT models use multipart endpoint ===
            const fields: Record<string, string | Buffer> = {
                file: audioBuffer,
                model: model,
            };

            if (args.language) {
                fields.language = args.language;
            }

            const response = await httpsPostMultipart(
                'https://gen.pollinations.ai/v1/audio/transcriptions',
                fields,
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const data = JSON.parse(response.data.toString());
            transcript = data.text || '';
            detectedLanguage = data.language || '';

            if (!transcript) {
                return `❌ Aucune transcription générée.
💡 Vérifiez que l'audio contient de la parole claire.`;
            }

            // Build result
            const lines: string[] = [
                `🎙️ Transcription Audio`,
                `━━━━━━━━━━━━━━━━━━`,
                `Fichier: ${fileName}`,
                `Taille: ${formatFileSize(fileSize)}`,
                `Modèle: ${model}`,
            ];

            if (detectedLanguage) {
                lines.push(`Langue détectée: ${detectedLanguage}`);
            }
            if (args.language) {
                lines.push(`Langue demandée: ${args.language}`);
            }

            lines.push(``);
            lines.push(`📝 **Transcription:**`);
            lines.push(``);
            lines.push(transcript);

            // Save transcript if requested
            if (args.save_transcript) {
                const outputDir = process.env.HOME
                    ? path.join(process.env.HOME, 'Downloads', 'pollinations', 'transcripts')
                    : '/tmp';
                ensureDir(outputDir);

                const baseName = path.basename(fileName, path.extname(fileName));
                const outputPath = path.join(outputDir, `${baseName}_transcript.txt`);

                fs.writeFileSync(outputPath, transcript);
                lines.push(``);
                lines.push(`💾 Transcription sauvegardée: ${outputPath}`);
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            if (err.message?.includes('413') || err.message?.includes('too large')) {
                return `❌ Fichier audio trop volumineux.
💡 Essayez de compresser ou découper l'audio.`;
            }
            return `❌ Erreur transcription: ${err.message}`;
        }
    },
});
