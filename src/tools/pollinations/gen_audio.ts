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
    getAudioModels,
    sanitizeFilename,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

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

export const polliGenAudioTool: ToolDefinition = tool({
    description: t('tools.polli_gen_audio.desc'),

    args: {
        text: tool.schema.string().describe(t('tools.polli_gen_audio.arg_text')),
        voice: tool.schema.string().optional().describe(t('tools.polli_gen_audio.arg_voice', { voice: DEFAULT_VOICE })),
        model: tool.schema.string().describe(t('tools.polli_gen_audio.arg_model', { model: DEFAULT_MODEL })),
        format: tool.schema.enum(['mp3', 'wav', 'pcm16']).optional().describe(t('tools.polli_gen_audio.arg_format')),
        save_to: tool.schema.string().optional().describe(t('tools.polli_gen_audio.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.polli_gen_audio.arg_filename')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_gen_audio.req_key');
        }

        const text = args.text;
        const model = args.model;
        const voice = args.voice || DEFAULT_VOICE;
        const format = args.format || DEFAULT_FORMAT;

        // Validate model (unknown models accepted as beta)
        const audioModels = getAudioModels();
        const modelInfo = audioModels[model];
        const isBetaModel = !modelInfo;

        if (isBetaModel) {
            emitStatusToast('warning', t('tools.polli_gen_audio.warn_beta', { model }), '🔊 gen_audio');
        }

        // Validate voice for selected model
        if (model === 'openai-audio' && !OPENAI_VOICES.includes(voice)) {
            return t('tools.polli_gen_audio.unsupported_openai', { voice, voices: OPENAI_VOICES.join(', ') });
        }

        if (model === 'elevenlabs' && !ELEVENLABS_VOICES.includes(voice)) {
            return t('tools.polli_gen_audio.unsupported_elevenlabs', { voice, count: ELEVENLABS_VOICES.length });
        }

        // Estimate cost
        const estimatedCost = estimateTtsCost(text.length);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_audio', args, model, estimatedCost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.polli_gen_audio.blocked');
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', t('tools.polli_gen_audio.toast_start', { model, length: text.length }) + argsStr, '🔊 polli_gen_audio');

        // Metadata
        context.metadata({ title: `🔊 TTS: ${voice}${isBetaModel ? ' (beta)' : ''} (${text.length} chars)` });

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
            let outputDir = getDefaultOutputDir('audio');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;

            if (args.save_to) {
                if (args.save_to.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }

            ensureDir(outputDir);

            filename = filename || generateFilename('tts', `${model}_${voice}`, actualFormat);
            const filePath = path.join(outputDir, filename.endsWith(`.${actualFormat}`) ? filename : `${filename}.${actualFormat}`);

            fs.writeFileSync(filePath, audioData);
            const fileSize = fs.statSync(filePath).size;

            // Estimate duration (approx 15 chars per second for speech)
            const estimatedDuration = Math.ceil(text.length / 15);

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

            lines.push(t('tools.polli_gen_audio.res_title'));
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.polli_gen_audio.res_text', { text: `${text.substring(0, 60)}${text.length > 60 ? '...' : ''}` }));
            lines.push(t('tools.polli_gen_audio.res_model', { model: `${model}${isBetaModel ? ' (beta)' : model === 'openai-audio' ? ' (recommandé)' : ''}` }));
            lines.push(t('tools.polli_gen_audio.res_voice', { voice }));
            lines.push(t('tools.polli_gen_audio.res_format', { format: actualFormat }));
            lines.push(t('tools.polli_gen_audio.res_est_duration', { duration: estimatedDuration }));
            lines.push(t('tools.polli_gen_audio.res_file', { path: filePath }));
            lines.push(t('tools.polli_gen_audio.res_size', { size: formatFileSize(fileSize) }));

            // Cost info
            if (isCostEstimatorEnabled()) {
                if (isTokenBased('audio', model)) {
                    const maxCost = estimatedCost * 3;
                    lines.push(t('tools.polli_gen_audio.res_cost_tok', { cost: formatCost(actualCost), maxCost: formatCost(maxCost) }));
                } else {
                    lines.push(t('tools.polli_gen_audio.res_cost', { cost: formatCost(actualCost) }));
                }
            }

            if (responseHeaders['x-request-id']) {
                lines.push(t('tools.polli_gen_audio.res_request_id', { id: responseHeaders['x-request-id'] }));
            }

            // Emit success toast
            emitStatusToast('success', t('tools.polli_gen_audio.toast_success', { model, voice }), '🔊 gen_audio');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.polli_gen_audio.toast_err', { error: err.message?.substring(0, 60) }), '🔊 gen_audio');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.polli_gen_audio.err_pollen');
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return t('tools.polli_gen_audio.err_auth');
            }
            return t('tools.polli_gen_audio.err_tts', { error: err.message });
        }
    },
});
