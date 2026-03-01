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
    sanitizeFilename,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 10;
const MODEL_NAME = 'elevenmusic';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliGenMusicTool: ToolDefinition = tool({
    description: t('tools.polli_gen_music.desc'),

    args: {
        prompt: tool.schema.string().describe(t('tools.polli_gen_music.arg_prompt')),
        duration: tool.schema.number().optional()
            .describe(t('tools.polli_gen_music.arg_duration', { default: DEFAULT_DURATION, max: 300 })),
        instrumental: tool.schema.boolean().optional().describe(t('tools.polli_gen_music.arg_instrumental')),
        seed: tool.schema.number().optional().describe(t('tools.polli_gen_music.arg_seed')),
        save_to: tool.schema.string().optional().describe(t('tools.polli_gen_music.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.polli_gen_music.arg_filename')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_gen_music.req_key');
        }

        // Get dynamic range from ModelRegistry (populated via OpenAPI)
        const { getMusicModel } = await import('./shared.js');
        const modelConfig = getMusicModel()[MODEL_NAME];
        const [minDuration, maxDuration] = modelConfig?.duration || [3, 300];

        const duration = Math.min(Math.max(args.duration || DEFAULT_DURATION, minDuration), maxDuration);
        const instrumental = args.instrumental || false;

        // Estimate cost
        const estimatedCost = estimateMusicCost(duration);

        // Cost Guard check V2
        const costCheck = checkCostControl('polli_gen_music', args, MODEL_NAME, estimatedCost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.polli_gen_music.blocked');
        }

        // Estimate generation time
        const genTimeSeconds = Math.ceil(duration * 1.2);

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', t('tools.polli_gen_music.toast_start', { duration, time: genTimeSeconds }) + argsStr, '🎵 polli_gen_music');

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

            lines.push(t('tools.polli_gen_music.res_title'));
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.polli_gen_music.res_prompt', { prompt: args.prompt }));
            lines.push(t('tools.polli_gen_music.res_duration', { duration }));
            lines.push(t('tools.polli_gen_music.res_mode', { mode: instrumental ? t('tools.polli_gen_music.res_mode_inst') : t('tools.polli_gen_music.res_mode_vocal') }));
            lines.push(t('tools.polli_gen_music.res_file', { path: filePath }));
            lines.push(t('tools.polli_gen_music.res_size', { size: formatFileSize(fileSize) }));

            // Cost info
            if (isCostEstimatorEnabled()) {
                if (isTokenBased('audio', MODEL_NAME)) {
                    const maxCost = estimatedCost * 3;
                    lines.push(t('tools.polli_gen_music.res_cost_tok', { cost: formatCost(actualCost), maxCost: formatCost(maxCost) }));
                } else {
                    lines.push(t('tools.polli_gen_music.res_cost', { cost: formatCost(actualCost) }));
                }
            }

            if (responseHeaders['x-model-used']) {
                lines.push(t('tools.polli_gen_music.res_model_used', { model: responseHeaders['x-model-used'] }));
            }
            if (responseHeaders['x-request-id']) {
                lines.push(t('tools.polli_gen_music.res_request_id', { id: responseHeaders['x-request-id'] }));
            }

            // Emit success toast
            emitStatusToast('success', t('tools.polli_gen_music.toast_success', { duration }), '🎵 gen_music');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.polli_gen_music.toast_err', { error: err.message?.substring(0, 60) }), '🎵 gen_music');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.polli_gen_music.err_pollen');
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return t('tools.polli_gen_music.err_auth');
            }
            if (err.message?.includes('Timeout')) {
                return t('tools.polli_gen_music.err_timeout');
            }
            return t('tools.polli_gen_music.err_gen', { error: err.message });
        }
    },
});
