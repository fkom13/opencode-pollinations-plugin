/**
 * gen_audio Tool - Pollinations Text-to-Speech
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Two TTS options:
 * 1. openai-audio (DEFAULT): GPT-4o Audio Preview - uses /v1/chat/completions with modalities
 *    - Supports both TTS and STT (Speech-to-Text)
 *    - Least expensive option
 *    - Voices: alloy, echo, fable, onyx, nova, shimmer
 *    - Formats: mp3, wav, pcm16
 * 
 * 2. elevenlabs: ElevenLabs v3 TTS - uses /audio/{text}
 *    - 34 expressive voices
 *    - Higher quality but more expensive
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsPost,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateTtsCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    AUDIO_MODELS,
} from './shared.js';

// ─── TTS Configuration ────────────────────────────────────────────────────

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const ELEVENLABS_VOICES = [
    'rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy',
    'sarah', 'emily', 'lily', 'matilda',
    'adam', 'antoni', 'arnold', 'josh', 'sam', 'daniel',
    'charlie', 'james', 'fin', 'callum', 'liam', 'george', 'brian', 'bill',
    'ash', 'ballad', 'coral', 'sage', 'verse',
];

const DEFAULT_VOICE = 'alloy';
const DEFAULT_MODEL = 'openai-audio'; // Changed: openai-audio is now default (least expensive)
const DEFAULT_FORMAT = 'mp3';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genAudioTool: ToolDefinition = tool({
    description: `Convert text to speech using Pollinations AI.

**🔊 Models:**

| Model | Type | Voices | Format | Cost | Notes |
|-------|------|--------|--------|------|-------|
| openai-audio | TTS + STT | 6 | mp3, wav, pcm16 | Lowest | **DEFAULT** - GPT-4o Audio |
| elevenlabs | TTS | 34 | mp3, wav, etc. | Higher | Expressive voices |

**🎵 OpenAI Audio (Default, Recommended):**
- Voices: \`alloy\`, \`echo\`, \`fable\`, \`onyx\`, \`nova\`, \`shimmer\`
- Formats: \`mp3\` (default), \`wav\`, \`pcm16\`
- Uses GPT-4o Audio Preview modalities endpoint
- Lowest cost option

**🎤 ElevenLabs:**
- 34 expressive voices including: rachel, domi, bella, adam, etc.
- Higher quality natural-sounding speech
- More expensive but more expressive

**💡 Tips:**
- Use \`openai-audio\` for cost-effective TTS
- Use \`elevenlabs\` for more expressive/character voices
- For STT (transcription), use the \`transcribe_audio\` tool`,

    args: {
        text: tool.schema.string().describe('Text to convert to speech'),
        voice: tool.schema.string().optional().describe(`Voice to use (default: ${DEFAULT_VOICE})`),
        model: tool.schema.string().optional().describe(`TTS model (default: ${DEFAULT_MODEL})`),
        format: tool.schema.enum(['mp3', 'wav', 'pcm16']).optional().describe('Audio format (default: mp3, openai-audio only)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Le TTS nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const text = args.text;
        const model = args.model || DEFAULT_MODEL;
        const voice = args.voice || DEFAULT_VOICE;
        const format = args.format || DEFAULT_FORMAT;

        // Validate model
        const modelInfo = AUDIO_MODELS[model];
        if (!modelInfo) {
            return `❌ Modèle inconnu: ${model}
💡 Modèles disponibles: ${Object.keys(AUDIO_MODELS).filter(m => AUDIO_MODELS[m].type === 'tts' || AUDIO_MODELS[m].type === 'both').join(', ')}`;
        }

        // Validate voice for selected model
        if (model === 'openai-audio' && !OPENAI_VOICES.includes(voice)) {
            return `⚠️ Voix "${voice}" non supportée par openai-audio.
💡 Voix OpenAI: ${OPENAI_VOICES.join(', ')}`;
        }
        
        if (model === 'elevenlabs' && !ELEVENLABS_VOICES.includes(voice)) {
            return `⚠️ Voix "${voice}" non reconnue pour elevenlabs.
💡 Voix ElevenLabs populaires: rachel, domi, bella, adam, josh...
📋 Total: ${ELEVENLABS_VOICES.length} voix disponibles`;
        }

        // Estimate cost
        const estimatedCost = estimateTtsCost(text.length);

        // Metadata
        context.metadata({ title: `🔊 TTS: ${voice} (${text.length} chars)` });

        try {
            let audioData: Buffer;
            let responseHeaders: Record<string, string> = {};
            let actualFormat = format;

            if (model === 'openai-audio') {
                // === OpenAI Audio: Use modalities endpoint ===
                // POST /v1/chat/completions with audio modalities
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/chat/completions',
                    {
                        model: 'openai-audio',
                        modalities: ['text', 'audio'],
                        audio: {
                            voice: voice,
                            format: format,
                        },
                        messages: [
                            {
                                role: 'user',
                                content: text
                            }
                        ],
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );
                
                const data = JSON.parse(response.data.toString());
                
                // Extract audio from response
                const audioBase64 = data.choices?.[0]?.message?.audio?.data;
                if (!audioBase64) {
                    throw new Error('No audio data in response');
                }
                
                audioData = Buffer.from(audioBase64, 'base64');
                responseHeaders = response.headers;
                
            } else if (model === 'elevenlabs') {
                // === ElevenLabs: Use audio endpoint ===
                // GET/POST /audio/{text}
                const promptEncoded = encodeURIComponent(text);
                const url = `https://gen.pollinations.ai/audio/${promptEncoded}?model=elevenlabs&voice=${voice}`;
                
                // For elevenlabs, we might need a different approach
                // Let's use POST with JSON body
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/audio/speech',
                    {
                        model: 'elevenlabs',
                        input: text,
                        voice: voice,
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );
                
                // Check if response is JSON (error) or binary (audio)
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const data = JSON.parse(response.data.toString());
                    throw new Error(data.error?.message || 'Unknown error');
                }
                
                audioData = response.data;
                responseHeaders = response.headers;
            } else {
                // Fallback to OpenAI-compatible endpoint
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/audio/speech',
                    {
                        model: model,
                        input: text,
                        voice: voice,
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );
                
                audioData = response.data;
                responseHeaders = response.headers;
            }

            // Save audio
            const outputDir = args.save_to || getDefaultOutputDir('audio');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('tts', `${model}_${voice}`, actualFormat);
            const filePath = path.join(outputDir, filename.endsWith(`.${actualFormat}`) ? filename : `${filename}.${actualFormat}`);

            fs.writeFileSync(filePath, audioData);
            const fileSize = fs.statSync(filePath).size;

            // Estimate duration (approx 15 chars per second for speech)
            const estimatedDuration = Math.ceil(text.length / 15);

            // Build result
            const lines: string[] = [
                `🔊 Audio Généré (TTS)`,
                `━━━━━━━━━━━━━━━━━━`,
                `Texte: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`,
                `Modèle: ${model}${model === 'openai-audio' ? ' (recommandé)' : ''}`,
                `Voix: ${voice}`,
                `Format: ${actualFormat}`,
                `Durée estimée: ~${estimatedDuration}s`,
                `Fichier: ${filePath}`,
                `Taille: ${formatFileSize(fileSize)}`,
            ];
            
            // Cost info
            if (isCostEstimatorEnabled()) {
                lines.push(`Coût estimé: ${formatCost(estimatedCost)}`);
            }
            
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            return `❌ Erreur TTS: ${err.message}`;
        }
    },
});
