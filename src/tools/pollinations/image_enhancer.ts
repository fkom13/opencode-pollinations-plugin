// image_enhancer — Amélioration IA (débruitage, netteté) via imgupscaler.com
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

export const imageEnhancerTool: ToolDefinition = tool({
    description: t('tools.image_enhancer.desc'),

    args: {
        file: tool.schema.string().describe(t('tools.image_enhancer.arg_file')),
        target_longest_side: tool.schema.enum(['1024', '2048', '4096']).optional().describe(t('tools.image_enhancer.arg_target')),
        save_to: tool.schema.string().optional().describe(t('tools.image_enhancer.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.image_enhancer.arg_filename')),
    },

    async execute(args, context) {
        const imagePath = args.file;
        let input;
        try {
            input = await resolveArtifactInput(imagePath, 'image');
        } catch {
            return t('tools.image_enhancer.file_not_found', { path: imagePath });
        }
        if (!input.mime.startsWith('image/')) return t('tools.image_enhancer.error', { error: `unsupported input type ${input.mime}` });
        const mimeType = input.mime;
        const imageData = input.buf;
        const targetLongestSide = parseInt(args.target_longest_side || '2048');
        const resLabel = targetLongestSide >= 4096 ? '4K' : targetLongestSide >= 2048 ? '2K' : '1K';

        context.metadata({ title: '✨ image_enhancer', metadata: { type: 'info', message: t('tools.image_enhancer.working', { resolution: resLabel }) } });

        try {
            const result = await processTool('enhance', {
                data: imageData,
                contentType: mimeType,
                filename: input.filename,
                options: { targetLongestSide },
            });

            if (!result.imageUrl) {
                return t('tools.image_enhancer.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('image_enhancer');
            const outputFilename = args.filename ? sanitizeFilename(args.filename) : generateFilename('enhance', 'imgupscaler', 'png');
            const persisted = persistArtifact(dl.data, { outputDir, filename: outputFilename, preferredExt: 'png' });
            const filePath = persisted.filePath;
    emitStatusToast('success', t('tools.image_enhancer.success'), 'image_enhancer', { filePath, freeTool: true });

            const fileSize = persisted.size;

            const lines: string[] = [];
            lines.push(t('tools.image_enhancer.res_title'));
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(t('tools.image_enhancer.res_file', { path: filePath }));
            lines.push(t('tools.image_enhancer.res_size', { size: formatFileSize(fileSize) }));
            lines.push(t('tools.image_enhancer.res_resolution', { resolution: resLabel }));
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "image_enhancer", { freeTool: true });
            return t('tools.image_enhancer.error', { error: err.message || String(err) });
        }
    },
});