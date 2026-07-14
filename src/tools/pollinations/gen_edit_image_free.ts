/**
 * gen_edit_image_free — Always-Free image generation & editing (BONUS tool)
 *
 * Independent FREE-bucket tool: works for ANY OpenCode model, with or WITHOUT a
 * Pollinations API key. Acts as an "always free" fallback for image gen/edit,
 * outside the Pollinations economy (no Pollen, no cost guard).
 *
 * Backed by a public image playground (reverse-engineered open endpoint).
 * Direct-only: the request goes from the END USER's IP, respecting the
 * playground's own 20-generations/IP/day free limit (gen + edit SHARE the same
 * counter). Past the daily quota, prefer Pollinations models.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    httpsGet,
    httpsPost,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatFileSize,
    sanitizeFilename,
} from './shared.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const PLAYGROUND = 'https://p-image-playground-production.up.railway.app';
const STATUS_URL = `${PLAYGROUND}/api/generation-status`;
const GEN_URL = `${PLAYGROUND}/api/generate-image`;
const EDIT_URL = `${PLAYGROUND}/api/generate-image-edit`;
const VALID_RATIOS = ['16:9', '1:1', '9:16'];

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

/**
 * Normalize an image input into a data: URI.
 * Accepts: data: URIs (passthrough), local file paths, http(s) URLs (downloaded).
 */
async function toDataUri(img: string): Promise<string> {
    if (img.startsWith('data:')) return img;

    if (/^https?:\/\//i.test(img)) {
        const res = await httpsGet(img);
        const ext = (img.split('?')[0].split('.').pop() || 'jpeg').toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${res.data.toString('base64')}`;
    }

    if (fs.existsSync(img)) {
        const ext = path.extname(img).toLowerCase().replace('.', '');
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${fs.readFileSync(img).toString('base64')}`;
    }

    // Assume already raw base64
    return img;
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genEditImageFreeTool: ToolDefinition = tool({
    description: t('tools.gen_edit_image_free.desc'),

    args: {
        prompt: tool.schema.string().describe(t('tools.gen_edit_image_free.arg_prompt')),
        images: tool.schema.array(tool.schema.string()).optional()
            .describe(t('tools.gen_edit_image_free.arg_images')),
        aspect_ratio: tool.schema.enum(['16:9', '1:1', '9:16']).optional()
            .describe(t('tools.gen_edit_image_free.arg_aspect')),
        save_to: tool.schema.string().optional().describe(t('tools.gen_edit_image_free.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.gen_edit_image_free.arg_filename')),
    },

    async execute(args, context) {
        const isEdit = Array.isArray(args.images) && args.images.length > 0;
        const mode = isEdit ? 'edit' : 'generate';

        // Validate edit input count (playground supports 1-3)
        if (isEdit && args.images!.length > 3) {
            return t('tools.gen_edit_image_free.too_many_images');
        }

        // 1. Check the per-IP daily quota (read-only, free)
        const quota = await fetchQuota();
        if (quota && !quota.canGenerate) {
            return t('tools.gen_edit_image_free.quota_exhausted', { max: quota.max });
        }

        context.metadata({ title: `🆓 ${isEdit ? 'Edit' : 'Image'} (free)` });
        emitStatusToast('info', t('tools.gen_edit_image_free.working', { mode }), '🆓 gen_edit_image_free');

        try {
            // 2. Build request and call the playground (from the user's IP)
            let apiResp: any;
            if (isEdit) {
                const processed = await Promise.all(args.images!.map(toDataUri));
                const res = await httpsPost(EDIT_URL, { prompt: args.prompt, images: processed });
                apiResp = JSON.parse(res.data.toString());
            } else {
                const aspect = args.aspect_ratio && VALID_RATIOS.includes(args.aspect_ratio)
                    ? args.aspect_ratio : '16:9';
                const res = await httpsPost(GEN_URL, {
                    prompt: args.prompt,
                    aspect_ratio: aspect,
                    disable_safety_checker: false,
                });
                apiResp = JSON.parse(res.data.toString());
            }

            if (!apiResp || !apiResp.success || !apiResp.imageUrl) {
                const reason = apiResp?.error || 'unknown';
                emitStatusToast('error', t('tools.gen_edit_image_free.failed', { error: String(reason).substring(0, 60) }), '🆓 gen_edit_image_free', { freeTool: true });
                return t('tools.gen_edit_image_free.api_error', { error: String(reason) });
            }

            // 3. Download the produced image and save it locally
            const dl = await httpsGet(apiResp.imageUrl);

            let outputDir = getDefaultOutputDir('images');
            let filename = args.filename ? sanitizeFilename(args.filename) : undefined;
            if (args.save_to) {
                if (args.save_to.match(/\.(png|jpe?g|webp)$/i)) {
                    outputDir = path.dirname(args.save_to);
                    filename = path.basename(args.save_to);
                } else {
                    outputDir = args.save_to;
                }
            }
            ensureDir(outputDir);
            filename = filename || generateFilename(isEdit ? 'edit' : 'image', 'free', 'jpg');
            const filePath = path.join(outputDir, filename.includes('.') ? filename : `${filename}.jpg`);
            fs.writeFileSync(filePath, dl.data);

            // 4. Re-read quota for an accurate "remaining" figure
            const after = await fetchQuota();
            const fileSize = fs.statSync(filePath).size;

            const lines: string[] = [];
            lines.push(t(isEdit ? 'tools.gen_edit_image_free.res_title_edit' : 'tools.gen_edit_image_free.res_title_gen'));
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(t('tools.gen_edit_image_free.res_prompt', { prompt: args.prompt.substring(0, 100) }));
            lines.push(t('tools.gen_edit_image_free.res_file', { path: filePath }));
            lines.push(t('tools.gen_edit_image_free.res_size', { size: formatFileSize(fileSize) }));
            if (after) {
                lines.push(t('tools.gen_edit_image_free.res_quota', { remaining: after.remaining, max: after.max }));
            }
            lines.push('');
            lines.push(t('tools.gen_edit_image_free.res_note'));

            const quotaMsg = after ? ` | ${after.remaining}/${after.max}/j` : '';
            emitStatusToast('success', t('tools.gen_edit_image_free.success', { mode }) + quotaMsg, '🆓 gen_edit_image_free', { filePath, freeTool: true });
            return lines.join('\n');

        } catch (err: any) {
            const msg = err.message || String(err);
            emitStatusToast('error', t('tools.gen_edit_image_free.failed', { error: msg.substring(0, 60) }), '🆓 gen_edit_image_free', { freeTool: true });
            // Graceful degradation: explicitly point to Pollinations models
            return t('tools.gen_edit_image_free.degraded', { error: msg.substring(0, 150) });
        }
    },
});
