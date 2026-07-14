/**
 * gen_video_free — Always-Free video generation (BONUS tool)
 *
 * Independent FREE-bucket tool: works for ANY OpenCode model, with or WITHOUT a
 * Pollinations API key. "Always free" video generation outside the Pollinations
 * economy (no Pollen, no cost guard).
 *
 * Backed by a public Pruna playground (reverse-engineered open endpoint),
 * direct-only from the END USER's IP, respecting the playground's own
 * 5-generations/IP/day free limit (SEPARATE from the image 20/day counter).
 *
 * Flow (async): POST multipart /api/p-video/generate -> { id }
 *               poll GET /api/p-video/status/{id} -> { status, output }
 *               download `output` mp4.
 *
 * Supports optional image (first-frame / reference) and optional audio join.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import {
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatFileSize,
    sanitizeFilename,
} from './shared.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const PLAYGROUND = 'https://pruna-playground-production-861e.up.railway.app';
const STATUS_URL = `${PLAYGROUND}/api/generation-status?model=p-video`;
const GEN_URL = `${PLAYGROUND}/api/p-video/generate`;
const JOB_STATUS = (id: string) => `${PLAYGROUND}/api/p-video/status/${id}`;

const VALID_RATIOS = ['16:9', '9:16', '1:1'];
const VALID_RES = ['480p', '720p', '1080p'];
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 75; // ~5 min ceiling

interface QuotaStatus {
    count: number;
    max: number;
    remaining: number;
    canGenerate: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function fetchQuota(): Promise<QuotaStatus | null> {
    try {
        const res = await httpsGet(STATUS_URL);
        return JSON.parse(res.data.toString());
    } catch {
        return null;
    }
}

/** Resolve an image/audio input (local path | http(s) URL | data: URI) to a Buffer + mime + filename. */
async function resolveAsset(input: string, kind: 'image' | 'audio'): Promise<{ buf: Buffer; mime: string; filename: string }> {
    // data: URI
    const dataMatch = input.match(/^data:([^;]+);base64,(.+)$/);
    if (dataMatch) {
        const mime = dataMatch[1];
        const ext = mime.split('/')[1] || (kind === 'image' ? 'jpeg' : 'mp3');
        return { buf: Buffer.from(dataMatch[2], 'base64'), mime, filename: `${kind}.${ext}` };
    }
    // http(s) URL
    if (/^https?:\/\//i.test(input)) {
        const res = await httpsGet(input);
        const ext = (input.split('?')[0].split('.').pop() || (kind === 'image' ? 'jpeg' : 'mp3')).toLowerCase();
        return { buf: res.data, mime: mimeFor(ext, kind), filename: `${kind}.${ext}` };
    }
    // local file
    if (fs.existsSync(input)) {
        const ext = path.extname(input).toLowerCase().replace('.', '') || (kind === 'image' ? 'jpeg' : 'mp3');
        return { buf: fs.readFileSync(input), mime: mimeFor(ext, kind), filename: path.basename(input) };
    }
    throw new Error(`Asset not found: ${input}`);
}

function mimeFor(ext: string, kind: 'image' | 'audio'): string {
    const e = ext.toLowerCase();
    if (kind === 'image') {
        if (e === 'png') return 'image/png';
        if (e === 'webp') return 'image/webp';
        return 'image/jpeg';
    }
    if (e === 'wav') return 'audio/wav';
    if (e === 'ogg') return 'audio/ogg';
    return 'audio/mpeg';
}

interface FilePart { field: string; buf: Buffer; mime: string; filename: string; }

/** Custom multipart POST: handles text fields AND typed file parts (image/audio). */
function multipartPost(url: string, textFields: Record<string, string>, files: FilePart[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const boundary = `----OCFormBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
        const parts: Buffer[] = [];

        for (const [k, v] of Object.entries(textFields)) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }
        for (const f of files) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename}"\r\nContent-Type: ${f.mime}\r\n\r\n`));
            parts.push(f.buf);
            parts.push(Buffer.from('\r\n'));
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        const body = Buffer.concat(parts);

        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
                'User-Agent': 'OpenCode-Pollinations-Plugin',
                'Origin': PLAYGROUND,
            },
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const txt = Buffer.concat(chunks).toString();
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(txt)); } catch { reject(new Error('Bad JSON: ' + txt.slice(0, 150))); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${txt.slice(0, 150)}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Upload timeout')); });
        req.write(body);
        req.end();
    });
}

async function pollJob(id: string): Promise<string> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        try {
            const res = await httpsGet(JOB_STATUS(id));
            const j = JSON.parse(res.data.toString());
            if (j.status === 'succeeded' && j.output) return j.output;
            if (j.status === 'failed' || j.status === 'canceled' || j.error) {
                throw new Error(j.error || `job ${j.status}`);
            }
        } catch (e: any) {
            // transient network error during polling: keep trying unless it's a job failure
            if (/job (failed|canceled)/.test(e.message)) throw e;
        }
    }
    throw new Error('Polling timeout (video took too long)');
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genVideoFreeTool: ToolDefinition = tool({
    description: t('tools.gen_video_free.desc'),

    args: {
        prompt: tool.schema.string().describe(t('tools.gen_video_free.arg_prompt')),
        image: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_image')),
        audio: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_audio')),
        duration: tool.schema.number().min(1).max(10).optional().describe(t('tools.gen_video_free.arg_duration')),
        aspect_ratio: tool.schema.enum(['16:9', '9:16', '1:1']).optional().describe(t('tools.gen_video_free.arg_aspect')),
        resolution: tool.schema.enum(['480p', '720p', '1080p']).optional().describe(t('tools.gen_video_free.arg_resolution')),
        save_to: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.gen_video_free.arg_filename')),
    },

    async execute(args, context) {
        // 1. Quota check (read-only, free, separate 5/day counter)
        const quota = await fetchQuota();
        if (quota && !quota.canGenerate) {
            return t('tools.gen_video_free.quota_exhausted', { max: quota.max });
        }

        context.metadata({ title: '🆓 Video (free)' });
        emitStatusToast('info', t('tools.gen_video_free.working'), '🆓 gen_video_free');

        try {
            // 2. Build multipart payload (contract captured from the playground)
            const aspect = args.aspect_ratio && VALID_RATIOS.includes(args.aspect_ratio) ? args.aspect_ratio : '16:9';
            const resolution = args.resolution && VALID_RES.includes(args.resolution) ? args.resolution : '720p';
            const duration = String(args.duration ?? 5);

            const textFields: Record<string, string> = {
                prompt: args.prompt,
                duration,
                aspect_ratio: aspect,
                resolution,
                fps: '24',
                draft: 'false',
                prompt_upsampling: 'true',
                save_audio: 'true',
            };

            const files: FilePart[] = [];
            if (args.image) {
                const a = await resolveAsset(args.image, 'image');
                files.push({ field: 'image', buf: a.buf, mime: a.mime, filename: a.filename });
            }
            if (args.audio) {
                const a = await resolveAsset(args.audio, 'audio');
                files.push({ field: 'audio', buf: a.buf, mime: a.mime, filename: a.filename });
            }

            // 3. Launch job
            const job = await multipartPost(GEN_URL, textFields, files);
            if (!job || !job.id) {
                return t('tools.gen_video_free.api_error', { error: JSON.stringify(job).slice(0, 120) });
            }

            // 4. Poll until ready
            const videoUrl = await pollJob(job.id);

            // 5. Download the mp4
            const dl = await httpsGet(videoUrl);

            let outputDir = getDefaultOutputDir('videos');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;
            if (args.save_to) {
                if (args.save_to.match(/\.(mp4|webm|mov)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }
            ensureDir(outputDir);
            filename = filename || generateFilename('video', 'free', 'mp4');
            const filePath = path.join(outputDir, filename.includes('.') ? filename : `${filename}.mp4`);
            fs.writeFileSync(filePath, dl.data);

            const after = await fetchQuota();
            const fileSize = fs.statSync(filePath).size;

            const lines: string[] = [];
            lines.push(t('tools.gen_video_free.res_title'));
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(t('tools.gen_video_free.res_prompt', { prompt: args.prompt.substring(0, 100) }));
            lines.push(t('tools.gen_video_free.res_params', { duration, resolution, aspect }));
            if (args.image) lines.push(t('tools.gen_video_free.res_image'));
            if (args.audio) lines.push(t('tools.gen_video_free.res_audio'));
            lines.push(t('tools.gen_video_free.res_file', { path: filePath }));
            lines.push(t('tools.gen_video_free.res_size', { size: formatFileSize(fileSize) }));
            if (after) lines.push(t('tools.gen_video_free.res_quota', { remaining: after.remaining, max: after.max }));
            lines.push('');
            lines.push(t('tools.gen_video_free.res_note'));

            const quotaMsg = after ? ` | ${after.remaining}/${after.max}/j` : '';
            emitStatusToast('success', t('tools.gen_video_free.success') + quotaMsg, '🆓 gen_video_free', { filePath, freeTool: true });
            return lines.join('\n');

        } catch (err: any) {
            const msg = err.message || String(err);
            emitStatusToast('error', t('tools.gen_video_free.failed', { error: msg.substring(0, 60) }), '🆓 gen_video_free', { freeTool: true });
            return t('tools.gen_video_free.degraded', { error: msg.substring(0, 150) });
        }
    },
});
