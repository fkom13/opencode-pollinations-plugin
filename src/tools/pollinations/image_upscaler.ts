// image_upscaler — Agrandissement 2x/4x via imgupscaler.com
// Standalone : appel direct depuis l'IP utilisateur, pas d'API, pas de clé

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    ensureDir, generateFilename, getDefaultOutputDir,
    formatFileSize, sanitizeFilename, httpsGet,
} from './shared.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';
import { processTool } from './imgtools/clients.js';
import { persistArtifact, resolveArtifactInput } from './artifact-core.js';

export const imageUpscalerTool: ToolDefinition = tool({
    description: t('tools.image_upscaler.desc'),

    args: {
        file: tool.schema.string().describe(t('tools.image_upscaler.arg_file')),
        ratio: tool.schema.enum(['2', '4']).optional().describe(t('tools.image_upscaler.arg_ratio')),
        save_to: tool.schema.string().optional().describe(t('tools.image_upscaler.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.image_upscaler.arg_filename')),
    },

    async execute(args, context) {
        const imagePath = args.file;
        let input;
        try {
            input = await resolveArtifactInput(imagePath, 'image');
        } catch {
            return t('tools.image_upscaler.file_not_found', { path: imagePath });
        }
        if (!input.mime.startsWith('image/')) return t('tools.image_upscaler.error', { error: `unsupported input type ${input.mime}` });
        const mimeType = input.mime;
        const imageData = input.buf;
        const ratio = args.ratio === '4' ? '400' : '200';
        const ratioLabel = args.ratio === '4' ? '4x' : '2x';

        context.metadata({ title: '📐 image_upscaler', metadata: { type: 'info', message: t('tools.image_upscaler.working', { ratio: ratioLabel }) } });

        try {
            const result = await processTool('upscale', {
                data: imageData,
                contentType: mimeType,
                filename: input.filename,
                options: { ratio },
            });

            if (!result.imageUrl) {
                return t('tools.image_upscaler.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('image_upscaler');
            const outputFilename = args.filename ? sanitizeFilename(args.filename) : generateFilename('upscale', 'imgupscaler', 'png');
            const persisted = persistArtifact(dl.data, { outputDir, filename: outputFilename, preferredExt: 'png' });
            const filePath = persisted.filePath;
    emitStatusToast('success', t('tools.image_upscaler.success'), 'image_upscaler', { filePath, freeTool: true });

            const fileSize = persisted.size;

            const lines: string[] = [];
            lines.push(t('tools.image_upscaler.res_title'));
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(t('tools.image_upscaler.res_file', { path: filePath }));
            lines.push(t('tools.image_upscaler.res_size', { size: formatFileSize(fileSize) }));
            lines.push(t('tools.image_upscaler.res_ratio', { ratio: ratioLabel }));
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "image_upscaler", { freeTool: true });
            return t('tools.image_upscaler.error', { error: err.message || String(err) });
        }
    },
});