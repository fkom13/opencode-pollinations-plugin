/** Always-free P-Video playground client. No Pollinations key / no Pollen. */
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as path from 'path';
import { httpsGet, getDefaultOutputDir, formatFileSize } from './shared.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';
import { detectArtifactType, persistArtifact, resolveArtifactInput } from './artifact-core.js';

const PLAYGROUND = 'https://pruna-playground-production-861e.up.railway.app';
const STATUS_URL = `${PLAYGROUND}/api/generation-status?model=p-video`;
const GEN_URL = `${PLAYGROUND}/api/p-video/generate`;
const JOB_STATUS = (id: string) => `${PLAYGROUND}/api/p-video/status/${encodeURIComponent(id)}`;

/** Conservative profile proven compatible with the free playground. */
export const FREE_VIDEO_PROFILE = Object.freeze({
    model: 'p-video',
    ratios: ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'] as const,
    resolutions: ['720p', '1080p'] as const,
    fps: [24, 48] as const,
    duration: { min: 1, max: 10, default: 5 },
    imageMime: ['image/jpeg', 'image/png', 'image/webp'],
    audioMime: ['audio/mpeg', 'audio/wav', 'audio/flac'],
});

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 90; // 6 min, repoll same job only

interface QuotaStatus { count: number; max: number; remaining: number; canGenerate: boolean; model?: string; }

export async function getFreeVideoQuota(): Promise<QuotaStatus | null> {
    try {
        const res = await httpsGet(STATUS_URL);
        const q = JSON.parse(res.data.toString());
        return typeof q?.canGenerate === 'boolean' ? q : null;
    } catch { return null; }
}

interface FilePart { field: string; buf: Buffer; mime: string; filename: string; }

function multipartPost(url: string, textFields: Record<string, string>, files: FilePart[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const boundary = `----OCFormBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
        const parts: Buffer[] = [];
        for (const [k, v] of Object.entries(textFields)) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }
        for (const f of files) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename.replace(/["\r\n]/g, '_')}"\r\nContent-Type: ${f.mime}\r\n\r\n`));
            parts.push(f.buf, Buffer.from('\r\n'));
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        const body = Buffer.concat(parts);
        const req = https.request({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST', headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'User-Agent': 'OpenCode-Pollinations-Plugin/6.5',
            'Origin': PLAYGROUND,
        }}, res => {
            const chunks: Buffer[] = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const txt = Buffer.concat(chunks).toString();
                let json: any = null;
                try { json = JSON.parse(txt); } catch { /* handled below */ }
                if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300 && json) resolve(json);
                else reject(new Error(`HTTP ${res.statusCode}: ${(json?.error || txt).slice?.(0, 240) || 'invalid response'}`));
            });
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Upload timeout')); });
        req.end(body);
    });
}

async function pollJob(id: string): Promise<string> {
    let transientErrors = 0;
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        try {
            const res = await httpsGet(JOB_STATUS(id));
            const j = JSON.parse(res.data.toString());
            transientErrors = 0;
            if (j.status === 'succeeded' && j.output) {
                if (typeof j.output === 'string') return j.output;
                const u = j.output?.generation_url || j.output?.url || j.output?.video || (Array.isArray(j.output) ? j.output[0] : null);
                if (u) return String(u);
                throw new Error('TERMINAL: job succeeded without a usable output URL');
            }
            if (j.status === 'failed' || j.status === 'canceled' || j.error) {
                throw new Error(`TERMINAL: ${j.error || `job ${j.status}`}`);
            }
        } catch (e: any) {
            if (String(e.message).startsWith('TERMINAL:')) throw new Error(String(e.message).slice(10).trim());
            transientErrors++;
            if (transientErrors >= 5) throw new Error(`Polling network/status failure after ${transientErrors} consecutive errors: ${e.message}`);
        }
    }
    throw new Error('Polling timeout: existing video job did not complete');
}

export const genVideoFreeTool: ToolDefinition = tool({
    description: t('tools.gen_video_free.desc'),
    args: {
        prompt: tool.schema.string().describe(t('tools.gen_video_free.arg_prompt')),
        image: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_image')),
        audio: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_audio')),
        duration: tool.schema.number().min(1).max(10).optional().describe(t('tools.gen_video_free.arg_duration')),
        aspect_ratio: tool.schema.enum(['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1']).optional().describe(t('tools.gen_video_free.arg_aspect')),
        resolution: tool.schema.enum(['720p', '1080p']).optional().describe(t('tools.gen_video_free.arg_resolution')),
        fps: tool.schema.enum(['24', '48']).optional().describe(t('tools.gen_video_free.arg_fps')),
        draft: tool.schema.boolean().optional().describe(t('tools.gen_video_free.arg_draft')),
        prompt_upsampling: tool.schema.boolean().optional().describe(t('tools.gen_video_free.arg_prompt_upsampling')),
        save_audio: tool.schema.boolean().optional().describe(t('tools.gen_video_free.arg_save_audio')),
        seed: tool.schema.number().int().min(0).max(2147483647).optional().describe(t('tools.gen_video_free.arg_seed')),
        save_to: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_filename')),
    },

    async execute(args, context) {
        const quota = await getFreeVideoQuota();
        if (quota && !quota.canGenerate) return t('tools.gen_video_free.quota_exhausted', { max: quota.max });
        context.metadata({ title: '🆓 P-Video (free)', metadata: quota ? { remaining: quota.remaining, max: quota.max } : undefined });
        emitStatusToast('info', t('tools.gen_video_free.working'), '🆓 gen_video_free');

        try {
            const aspect = args.aspect_ratio || '16:9';
            const resolution = args.resolution || '720p';
            const fps = Number(args.fps ?? '24');
            const duration = args.duration ?? FREE_VIDEO_PROFILE.duration.default;
            const textFields: Record<string, string> = {
                prompt: args.prompt,
                duration: String(duration),
                aspect_ratio: aspect,
                resolution,
                fps: String(fps),
                draft: String(args.draft ?? false),
                prompt_upsampling: String(args.prompt_upsampling ?? true),
                save_audio: String(args.save_audio ?? true),
            };
            if (args.seed !== undefined) textFields.seed = String(args.seed);

            const files: FilePart[] = [];
            if (args.image) {
                const a = await resolveArtifactInput(args.image, 'image');
                if (!FREE_VIDEO_PROFILE.imageMime.includes(a.mime as any)) throw new Error(`Unsupported image type ${a.mime}; use JPEG, PNG or WebP`);
                files.push({ field: 'image', buf: a.buf, mime: a.mime, filename: a.filename });
            }
            if (args.audio) {
                const a = await resolveArtifactInput(args.audio, 'audio');
                if (!FREE_VIDEO_PROFILE.audioMime.includes(a.mime as any)) throw new Error(`Unsupported audio type ${a.mime}; use MP3, WAV or FLAC`);
                files.push({ field: 'audio', buf: a.buf, mime: a.mime, filename: a.filename });
            }

            const job = await multipartPost(GEN_URL, textFields, files);
            if (job?.status === 'succeeded' && job.output) {
                // Some playground versions complete synchronously.
            } else if (!job?.id) {
                return t('tools.gen_video_free.api_error', { error: JSON.stringify(job).slice(0, 180) });
            }
            const videoUrl = job?.status === 'succeeded' && job.output
                ? (typeof job.output === 'string' ? job.output : job.output?.generation_url || job.output?.url || job.output?.video)
                : await pollJob(job.id);
            if (!videoUrl) throw new Error('No video output URL');

            const dl = await httpsGet(videoUrl);
            const detected = detectArtifactType(dl.data);
            if (!detected || !['video/mp4', 'video/webm'].includes(detected.mime)) throw new Error(`Invalid video artifact (${detected?.mime || 'unknown'})`);

            let outputDir = getDefaultOutputDir('videos');
            let filename = args.filename;
            if (args.save_to) {
                if (/\.(mp4|webm|mov)$/i.test(args.save_to)) { outputDir = path.dirname(args.save_to); filename = path.basename(args.save_to); }
                else outputDir = args.save_to;
            }
            const persisted = persistArtifact(dl.data, { outputDir, filename, preferredExt: 'mp4' });
            const after = await getFreeVideoQuota();
            const lines = [
                t('tools.gen_video_free.res_title'), '━━━━━━━━━━━━━━━━━━',
                t('tools.gen_video_free.res_prompt', { prompt: args.prompt.substring(0, 100) }),
                t('tools.gen_video_free.res_params_full', { duration, resolution, aspect, fps, draft: String(args.draft ?? false) }),
                args.image ? t('tools.gen_video_free.res_image') : '', args.audio ? t('tools.gen_video_free.res_audio') : '',
                t('tools.gen_video_free.res_file', { path: persisted.filePath }),
                t('tools.gen_video_free.res_size', { size: formatFileSize(persisted.size) }),
                after ? t('tools.gen_video_free.res_quota', { remaining: after.remaining, max: after.max }) : '',
                '', t('tools.gen_video_free.res_note'),
            ].filter(Boolean);
            const quotaMsg = after ? ` | ${after.remaining}/${after.max}` : '';
            emitStatusToast('success', t('tools.gen_video_free.success') + quotaMsg, '🆓 gen_video_free', { filePath: persisted.filePath, freeTool: true });
            return lines.join('\n');
        } catch (err: any) {
            const msg = err.message || String(err);
            emitStatusToast('error', t('tools.gen_video_free.failed', { error: msg.substring(0, 80) }), '🆓 gen_video_free', { freeTool: true });
            return t('tools.gen_video_free.degraded', { error: msg.substring(0, 200) });
        }
    },
});
