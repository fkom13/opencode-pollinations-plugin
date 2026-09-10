/** Always-free P-Image / P-Image-Edit playground client. */
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as path from 'path';
import { httpsGet, httpsPost, getDefaultOutputDir, formatFileSize } from './shared.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';
import { persistArtifact, resolveArtifactInput } from './artifact-core.js';

const PLAYGROUND = 'https://p-image-playground-production.up.railway.app';
const STATUS_URL = `${PLAYGROUND}/api/generation-status`;
const GEN_URL = `${PLAYGROUND}/api/generate-image`;
const EDIT_URL = `${PLAYGROUND}/api/generate-image-edit`;

export const FREE_IMAGE_PROFILE = Object.freeze({
    ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', 'custom', 'match_input_image'] as const,
    customSize: { min: 256, max: 1440, multiple: 16 },
    maxEditImages: 3,
    acceptedMime: ['image/jpeg', 'image/png', 'image/webp'],
});

interface QuotaStatus { count: number; max: number; remaining: number; canGenerate: boolean; }

export async function getFreeImageQuota(): Promise<QuotaStatus | null> {
    try {
        const res = await httpsGet(STATUS_URL);
        const q = JSON.parse(res.data.toString());
        return typeof q?.canGenerate === 'boolean' ? q : null;
    } catch { return null; }
}

async function toDataUri(img: string): Promise<string> {
    const a = await resolveArtifactInput(img, 'image');
    if (!FREE_IMAGE_PROFILE.acceptedMime.includes(a.mime as any)) throw new Error(`Unsupported image type ${a.mime}; use JPEG, PNG or WebP`);
    return `data:${a.mime};base64,${a.buf.toString('base64')}`;
}

function validateCustomSize(width?: number, height?: number): string | null {
    if (width === undefined || height === undefined) return 'custom aspect_ratio requires both width and height';
    for (const [name, value] of [['width', width], ['height', height]] as const) {
        if (!Number.isInteger(value) || value < 256 || value > 1440 || value % 16 !== 0) return `${name} must be 256..1440 and a multiple of 16`;
    }
    return null;
}

export const genEditImageFreeTool: ToolDefinition = tool({
    description: t('tools.gen_edit_image_free.desc'),
    args: {
        prompt: tool.schema.string().describe(t('tools.gen_edit_image_free.arg_prompt')),
        images: tool.schema.array(tool.schema.string()).optional().describe(t('tools.gen_edit_image_free.arg_images')),
        aspect_ratio: tool.schema.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', 'custom', 'match_input_image']).optional().describe(t('tools.gen_edit_image_free.arg_aspect')),
        width: tool.schema.number().int().min(256).max(1440).optional().describe(t('tools.gen_edit_image_free.arg_width')),
        height: tool.schema.number().int().min(256).max(1440).optional().describe(t('tools.gen_edit_image_free.arg_height')),
        seed: tool.schema.number().int().min(0).max(2147483647).optional().describe(t('tools.gen_edit_image_free.arg_seed')),
        prompt_upsampling: tool.schema.boolean().optional().describe(t('tools.gen_edit_image_free.arg_prompt_upsampling')),
        turbo: tool.schema.boolean().optional().describe(t('tools.gen_edit_image_free.arg_turbo')),
        save_to: tool.schema.string().optional().describe(t('tools.gen_edit_image_free.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.gen_edit_image_free.arg_filename')),
    },

    async execute(args, context) {
        const isEdit = Array.isArray(args.images) && args.images.length > 0;
        const mode = isEdit ? 'edit' : 'generate';
        if (isEdit && args.images!.length > FREE_IMAGE_PROFILE.maxEditImages) return t('tools.gen_edit_image_free.too_many_images', { max: FREE_IMAGE_PROFILE.maxEditImages });
        if (!isEdit && args.aspect_ratio === 'match_input_image') return t('tools.gen_edit_image_free.invalid_params', { error: 'match_input_image is edit-only' });
        if (isEdit && args.aspect_ratio === 'custom') return t('tools.gen_edit_image_free.invalid_params', { error: 'custom width/height is generation-only' });
        if (!isEdit && args.aspect_ratio === 'custom') {
            const e = validateCustomSize(args.width, args.height);
            if (e) return t('tools.gen_edit_image_free.invalid_params', { error: e });
        }

        const quota = await getFreeImageQuota();
        if (quota && !quota.canGenerate) return t('tools.gen_edit_image_free.quota_exhausted', { max: quota.max });
        context.metadata({ title: `🆓 P-Image ${isEdit ? 'Edit' : ''}`.trim(), metadata: quota ? { remaining: quota.remaining, max: quota.max } : undefined });
        emitStatusToast('info', t('tools.gen_edit_image_free.working', { mode }), '🆓 gen_edit_image_free');

        try {
            const aspect = args.aspect_ratio || (isEdit ? 'match_input_image' : '16:9');
            const payload: any = { prompt: args.prompt, aspect_ratio: aspect, disable_safety_checker: false };
            if (args.seed !== undefined) payload.seed = args.seed;
            if (!isEdit && args.prompt_upsampling !== undefined) payload.prompt_upsampling = args.prompt_upsampling;
            if (!isEdit && aspect === 'custom') { payload.width = args.width; payload.height = args.height; }
            if (isEdit) {
                payload.images = await Promise.all(args.images!.map(toDataUri));
                if (args.turbo !== undefined) payload.turbo = args.turbo;
            }

            const res = await httpsPost(isEdit ? EDIT_URL : GEN_URL, payload);
            const apiResp = JSON.parse(res.data.toString());
            if (!apiResp?.success || !apiResp.imageUrl) {
                const reason = apiResp?.error || apiResp?.details || 'unknown response';
                return t('tools.gen_edit_image_free.api_error', { error: String(reason).slice(0, 240) });
            }
            const dl = await httpsGet(apiResp.imageUrl);

            let outputDir = getDefaultOutputDir('images');
            let filename = args.filename;
            if (args.save_to) {
                if (/\.(png|jpe?g|webp|gif)$/i.test(args.save_to)) { outputDir = path.dirname(args.save_to); filename = path.basename(args.save_to); }
                else outputDir = args.save_to;
            }
            const persisted = persistArtifact(dl.data, { outputDir, filename, preferredExt: 'jpg' });
            const after = await getFreeImageQuota();
            const lines = [
                t(isEdit ? 'tools.gen_edit_image_free.res_title_edit' : 'tools.gen_edit_image_free.res_title_gen'), '━━━━━━━━━━━━━━━━━━',
                t('tools.gen_edit_image_free.res_prompt', { prompt: args.prompt.substring(0, 100) }),
                t('tools.gen_edit_image_free.res_params', { aspect, seed: args.seed === undefined ? 'random' : String(args.seed) }),
                t('tools.gen_edit_image_free.res_file', { path: persisted.filePath }),
                t('tools.gen_edit_image_free.res_size', { size: formatFileSize(persisted.size) }),
                t('tools.gen_edit_image_free.res_format', { format: (persisted.detected?.format || persisted.ext).toUpperCase() }),
                after ? t('tools.gen_edit_image_free.res_quota', { remaining: after.remaining, max: after.max }) : '',
                '', t('tools.gen_edit_image_free.res_note'),
            ].filter(Boolean);
            const quotaMsg = after ? ` | ${after.remaining}/${after.max}` : '';
            emitStatusToast('success', t('tools.gen_edit_image_free.success', { mode }) + quotaMsg, '🆓 gen_edit_image_free', { filePath: persisted.filePath, freeTool: true });
            return lines.join('\n');
        } catch (err: any) {
            const msg = err.message || String(err);
            emitStatusToast('error', t('tools.gen_edit_image_free.failed', { error: msg.substring(0, 80) }), '🆓 gen_edit_image_free', { freeTool: true });
            return t('tools.gen_edit_image_free.degraded', { error: msg.substring(0, 200) });
        }
    },
});
