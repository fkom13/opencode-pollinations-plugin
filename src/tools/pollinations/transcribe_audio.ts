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
import * as os from 'os';
import * as crypto from 'crypto';
import {
    getApiKey,
    httpsPost,
    httpsPostMultipart,
    ensureDir,
    formatFileSize,
    getAudioModels,
    isCostEstimatorEnabled,
} from './shared.js';
import { t } from '../../locales/index.js';
import { ModelRegistry } from '../../server/models/index.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl } from './cost-guard.js';
import { hasSystemFFprobe, runFFprobe } from '../ffmpeg.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'whisper-large-v3';
const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'mpeg', 'mpga', 'ogg'];

function probeAudioDurationSeconds(filePath: string): number | undefined {
    if (!hasSystemFFprobe()) return undefined;
    try {
        const raw = runFFprobe([
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath,
        ]);
        const seconds = Number(raw.trim());
        return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
    } catch {
        return undefined;
    }
}

function estimateSttCost(modelName: string, durationSeconds?: number): { cost: number; source: 'duration' | 'average' | 'conservative' } {
    const model = ModelRegistry.getByNameOrAlias('audio', modelName);
    const perSecond = Number(model?.pricing?.promptAudioSeconds ?? 0);
    if (durationSeconds && perSecond > 0) {
        return { cost: durationSeconds * perSecond, source: 'duration' };
    }

    const average = Number(model?.averageCost ?? 0);
    if (average > 0) {
        return { cost: average, source: 'average' };
    }

    const threshold = loadConfig().costThreshold ?? 0.15;
    return { cost: Math.max(threshold * 2, 0.25), source: 'conservative' };
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliSttTool: ToolDefinition = tool({
    description: t('tools.polli_transcribe_audio.desc'),

    args: {
        file: tool.schema.string().describe(t('tools.polli_transcribe_audio.arg_file')),
        model: tool.schema.string().describe(t('tools.polli_transcribe_audio.arg_model', { model: DEFAULT_MODEL })),
        language: tool.schema.string().optional().describe(t('tools.polli_transcribe_audio.arg_language')),
        save_transcript: tool.schema.boolean().optional().describe(t('tools.polli_transcribe_audio.arg_save')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_transcribe_audio.req_key');
        }

        let model = args.model;

        // Validate model, accepting live aliases (e.g. whisper-large-v3, scribe)
        // and normalize to the canonical Pollinations model id for billing.
        const audioModels = getAudioModels();
        const registryModel = ModelRegistry.getByNameOrAlias('audio', model);
        if (registryModel) model = registryModel.name;
        const modelInfo = audioModels[model];
        if (!modelInfo || (modelInfo.type !== 'stt' && modelInfo.type !== 'both')) {
            const models = Object.entries(audioModels)
                .filter(([, info]) => info.type === 'stt' || info.type === 'both')
                .map(([name]) => name)
                .join(', ');
            return t('tools.polli_transcribe_audio.err_unknown_model', { model: args.model, models });
        }

        // Check file
        let audioPath = args.file;
        let audioBuffer: Buffer;
        let fileName = 'audio.mp3';
        let audioDurationSeconds: number | undefined;

        if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
            // Download from URL
            context.metadata({ title: t('tools.polli_transcribe_audio.toast_dl') });

            try {
                // v6.5: use a single bounded fetch (timeout) instead of unbounded http(s).get.
                audioBuffer = Buffer.from(await (await fetch(audioPath, {
                    signal: AbortSignal.timeout(60000),
                    redirect: 'follow',
                })).arrayBuffer());

                // Extract filename from URL
                try {
                    const urlPath = new URL(audioPath).pathname;
                    fileName = path.basename(urlPath) || 'audio.mp3';
                } catch {
                    fileName = 'audio.mp3';
                }

                if (hasSystemFFprobe()) {
                    const ext = path.extname(fileName) || '.audio';
                    const tmpPath = path.join(os.tmpdir(), `polli-stt-${crypto.randomUUID()}${ext}`);
                    try {
                        fs.writeFileSync(tmpPath, audioBuffer);
                        audioDurationSeconds = probeAudioDurationSeconds(tmpPath);
                    } finally {
                        try { fs.unlinkSync(tmpPath); } catch { }
                    }
                }

            } catch (err: any) {
                return t('tools.polli_transcribe_audio.err_dl', { error: err.message });
            }

        } else {
            // Local file
            if (!fs.existsSync(audioPath)) {
                return t('tools.polli_transcribe_audio.err_not_found', { path: audioPath });
            }

            // Check format
            const ext = path.extname(audioPath).toLowerCase().replace('.', '');
            if (!SUPPORTED_FORMATS.includes(ext)) {
                return t('tools.polli_transcribe_audio.err_format', { ext, formats: SUPPORTED_FORMATS.join(', ') });
            }

            audioBuffer = fs.readFileSync(audioPath);
            fileName = path.basename(audioPath);
            audioDurationSeconds = probeAudioDurationSeconds(audioPath);
        }

        const fileSize = audioBuffer.length;

        // Cost Guard: prefer exact duration × live per-second pricing. If the
        // duration cannot be measured, fall back to a deliberately conservative
        // estimate so confirmation is required rather than spending blindly.
        const sttEstimate = estimateSttCost(model, audioDurationSeconds);
        const costCheck = checkCostControl('polli_stt', args, model, sttEstimate.cost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.polli_transcribe_audio.err_pollen');
        }

        // Metadata
        context.metadata({ title: t('tools.polli_transcribe_audio.toast_start', { model, size: formatFileSize(fileSize) }) });

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
                return t('tools.polli_transcribe_audio.err_no_transcript');
            }

            // Build result
            const lines: string[] = [
                t('tools.polli_transcribe_audio.res_title'),
                `━━━━━━━━━━━━━━━━━━`,
                t('tools.polli_transcribe_audio.res_file', { file: fileName }),
                t('tools.polli_transcribe_audio.res_size', { size: formatFileSize(fileSize) }),
                t('tools.polli_transcribe_audio.res_model', { model }),
            ];

            if (isCostEstimatorEnabled() && costCheck.message) {
                lines.push(costCheck.message);
            }

            if (detectedLanguage) {
                lines.push(t('tools.polli_transcribe_audio.res_lang_det', { lang: detectedLanguage }));
            }
            if (args.language) {
                lines.push(t('tools.polli_transcribe_audio.res_lang_req', { lang: args.language }));
            }

            lines.push(``);
            lines.push(t('tools.polli_transcribe_audio.res_transcript_title'));
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
                lines.push(t('tools.polli_transcribe_audio.res_saved', { path: outputPath }));
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.polli_transcribe_audio.err_pollen');
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return t('tools.polli_transcribe_audio.err_auth');
            }
            if (err.message?.includes('413') || err.message?.includes('too large')) {
                return t('tools.polli_transcribe_audio.err_large');
            }
            return t('tools.polli_transcribe_audio.err_stt', { error: err.message });
        }
    },
});
