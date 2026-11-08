/**
 * remove_background — resilient no-key background removal.
 *
 * Default: BGNinja (documented API, 10/day/IP, 2 concurrent/IP).
 * Auto fallback: legacy BGEraser; optional ClearBackdrop with free user key.
 * No paid route; BGEraser availability/limits are not guaranteed.
 * No paid provider, no rotation, no hidden billing path.
 */
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as path from 'path';
import { resolveOutputDir, formatFileSize, TOOL_DIRS } from '../shared.js';
import { httpsGet } from '../pollinations/shared.js';
import { processTool } from '../pollinations/imgtools/clients.js';
import { buildMultipart, httpsPost } from '../pollinations/imgtools/helpers.js';
import { detectArtifactType, persistArtifact, resolveArtifactInput } from '../pollinations/artifact-core.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

const BGNINJA_HOST = 'bgninja.com';
const BGNINJA_PATH = '/api/remove';
const CLEARBACKDROP_HOST = 'clearbackdrop.com';
const CLEARBACKDROP_PATH = '/api/v1/remove-background';

// The provider allows at most 2 simultaneous calls from one public IP.
// This local guard covers a single plugin process, not independent clients.
const BGNINJA_MAX_CONCURRENCY = 2;
let bgNinjaActive = 0;
const bgNinjaQueue: Array<() => void> = [];
async function withBgNinjaSlot<T>(action: () => Promise<T>): Promise<T> {
    if (bgNinjaActive >= BGNINJA_MAX_CONCURRENCY) {
        await new Promise<void>(resolve => bgNinjaQueue.push(resolve));
    } else {
        bgNinjaActive++;
    }
    try {
        return await action();
    } finally {
        const next = bgNinjaQueue.shift();
        if (next) next(); // slot ownership transfers without decrement
        else bgNinjaActive--;
    }
}

type Provider = 'auto' | 'bgninja' | 'bgeraser' | 'clearbackdrop';

function assertImage(buf: Buffer, provider: string): void {
    const detected = detectArtifactType(buf);
    if (!detected || !detected.mime.startsWith('image/')) {
        throw new Error(`${provider} returned invalid/non-image bytes`);
    }
    if (buf.length < 128) throw new Error(`${provider} returned an empty/invalid image`);
}

async function removeViaBgeraser(imageData: Buffer, mimeType: string, filename: string): Promise<Buffer> {
    const result = await processTool('rmbg', { data: imageData, contentType: mimeType, filename });
    if (!result.imageUrl) throw new Error('bgeraser returned no result URL');
    const res = await httpsGet(result.imageUrl);
    assertImage(res.data, 'bgeraser');
    return res.data;
}

async function removeViaBgNinja(imageData: Buffer, mimeType: string, filename: string): Promise<Buffer> {
    const { boundary, body } = buildMultipart([
        { name: 'file', value: imageData, filename, contentType: mimeType },
    ]);
    return withBgNinjaSlot(async () => {
    const res = await httpsPost(BGNINJA_HOST, BGNINJA_PATH, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Accept': 'image/png,image/*,*/*',
        'User-Agent': 'OpenCode-Pollinations-Plugin/7',
    }, body);
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`BGNinja HTTP ${res.status}: ${res.body.toString('utf8').slice(0, 160)}`);
    }
    assertImage(res.body, 'BGNinja');
    return res.body;
    });
}

async function removeViaClearBackdrop(imageData: Buffer, mimeType: string, filename: string): Promise<Buffer> {
    const { boundary, body } = buildMultipart([
        { name: 'image', value: imageData, filename, contentType: mimeType },
    ]);
    const res = await httpsPost(CLEARBACKDROP_HOST, CLEARBACKDROP_PATH, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Accept': 'image/png,image/webp,image/*,*/*',
        'User-Agent': 'OpenCode-Pollinations-Plugin/7',
        ...(process.env.CLEARBACKDROP_API_KEY ? { 'X-API-Key': process.env.CLEARBACKDROP_API_KEY } : {}),
    }, body);
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`ClearBackdrop HTTP ${res.status}: ${res.body.toString('utf8').slice(0, 160)}`);
    }
    assertImage(res.body, 'ClearBackdrop');
    return res.body;
}

export const removeBackgroundTool: ToolDefinition = tool({
    description: t('tools.remove_background.desc'),
    args: {
        image_path: tool.schema.string().describe(t('tools.remove_background.arg_image')),
        filename: tool.schema.string().optional().describe(t('tools.remove_background.arg_filename')),
        output_path: tool.schema.string().optional().describe(t('tools.remove_background.arg_output')),
        provider: tool.schema.enum(['auto', 'bgninja', 'bgeraser', 'clearbackdrop']).optional()
            .describe(t('tools.remove_background.arg_provider')),
    },

    async execute(args, context) {
        const provider = (args.provider || 'auto') as Provider;
        let input;
        try {
            input = await resolveArtifactInput(args.image_path, 'image');
        } catch (err: any) {
            return t('tools.remove_background.input_error', { error: err.message || String(err) });
        }
        if (!input.mime.startsWith('image/')) {
            return t('tools.remove_background.input_error', { error: `unsupported input type ${input.mime}` });
        }

        const basename = path.basename(input.filename || 'image');
        const attempts: Array<{ name: Exclude<Provider, 'auto'>; run: () => Promise<Buffer> }> = [];
        if (provider === 'auto' || provider === 'bgninja') {
            attempts.push({ name: 'bgninja', run: () => removeViaBgNinja(input.buf, input.mime, basename) });
        }
        // A no-key fallback prevents an empty auto chain on BGNinja HTTP 402/429.
        // Legacy BGEraser has no confirmed contractual unlimited API guarantee.
        if (provider === 'auto' || provider === 'bgeraser') {
            attempts.push({ name: 'bgeraser', run: () => removeViaBgeraser(input.buf, input.mime, basename) });
        }
        // Anonymous ClearBackdrop access ended 2026-11-05.
        // Only use with explicit user-provided key.
        if (provider === 'clearbackdrop' || (provider === 'auto' && !!process.env.CLEARBACKDROP_API_KEY)) {
            attempts.push({ name: 'clearbackdrop', run: () => removeViaClearBackdrop(input.buf, input.mime, basename) });
        }
        const failures: string[] = [];
        for (const attempt of attempts) {
            try {
                context.metadata({ title: `✂️ RMBG · ${attempt.name}` });
                emitStatusToast('info', t('tools.remove_background.working', { provider: attempt.name }), 'remove_background', { freeTool: true });
                const output = await attempt.run();
                const detected = detectArtifactType(output);
                if (!detected || !detected.mime.startsWith('image/')) throw new Error('invalid artifact type');

                const outputDir = resolveOutputDir(TOOL_DIRS.rembg, args.output_path);
                const defaultBase = `${path.basename(basename, path.extname(basename))}_nobg`;
                const persisted = persistArtifact(output, {
                    outputDir,
                    filename: args.filename || defaultBase,
                    preferredExt: 'png',
                });

                emitStatusToast('success', t('tools.remove_background.success', { provider: attempt.name }), 'remove_background', { filePath: persisted.filePath, freeTool: true });
                return [
                    t('tools.remove_background.res_title'),
                    '━━━━━━━━━━━━━━━━━━━━━',
                    t('tools.remove_background.res_file', { path: persisted.filePath }),
                    t('tools.remove_background.res_size', { size: formatFileSize(persisted.size) }),
                    t('tools.remove_background.res_format', { format: (persisted.detected?.format || persisted.ext).toUpperCase() }),
                    t('tools.remove_background.res_provider', { provider: attempt.name }),
                    provider === 'auto' && attempt.name !== 'bgninja' ? t('tools.remove_background.res_fallback', { provider: attempt.name }) : '',
                ].filter(Boolean).join('\n');
            } catch (err: any) {
                failures.push(`${attempt.name}: ${err.message || String(err)}`);
                if (provider !== 'auto') break;
                emitStatusToast('warning', t('tools.remove_background.fallback', { provider: attempt.name }), 'remove_background', { freeTool: true });
            }
        }

        emitStatusToast('error', t('tools.remove_background.failed'), 'remove_background', { freeTool: true });
        return t('tools.remove_background.error', { error: failures.join(' | ').slice(0, 500) });
    },
});
