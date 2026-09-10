// object_remover — Suppression d'objets par prompt via objectremover.com
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

export const objectRemoverTool: ToolDefinition = tool({
    description: t('tools.object_remover.desc'),

    args: {
        file: tool.schema.string().describe(t('tools.object_remover.arg_file')),
        prompt: tool.schema.string().describe(t('tools.object_remover.arg_prompt')),
        save_to: tool.schema.string().optional().describe(t('tools.object_remover.arg_save_to')),
        filename: tool.schema.string().optional().describe(t('tools.object_remover.arg_filename')),
    },

    async execute(args, context) {
        const imagePath = args.file;
        let input;
        try {
            input = await resolveArtifactInput(imagePath, 'image');
        } catch {
            return t('tools.object_remover.file_not_found', { path: imagePath });
        }
        if (!input.mime.startsWith('image/')) return t('tools.object_remover.error', { error: `unsupported input type ${input.mime}` });
        const mimeType = input.mime;
        const imageData = input.buf;
        const prompt = args.prompt || 'remove unwanted objects';

        context.metadata({ title: '🧹 object_remover', metadata: { type: 'info', message: t('tools.object_remover.working', { prompt }) } });

        try {
            const result = await processTool('ruo', {
                data: imageData,
                contentType: mimeType,
                filename: input.filename,
                options: { prompt },
            });

            if (!result.imageUrl) {
                return t('tools.object_remover.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('object_remover');
            const outputFilename = args.filename ? sanitizeFilename(args.filename) : generateFilename('ruo', 'object-remover', 'png');
            const persisted = persistArtifact(dl.data, { outputDir, filename: outputFilename, preferredExt: 'png' });
            const filePath = persisted.filePath;
            emitStatusToast('success', t('tools.object_remover.success'), 'object_remover', { filePath, freeTool: true });

            const fileSize = persisted.size;


            const lines: string[] = [];
            lines.push(t('tools.object_remover.res_title'));
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(t('tools.object_remover.res_file', { path: filePath }));
            lines.push(t('tools.object_remover.res_size', { size: formatFileSize(fileSize) }));
            lines.push(t('tools.object_remover.res_prompt', { prompt }));
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "object_remover", { freeTool: true });
            return t('tools.object_remover.error', { error: err.message || String(err) });
        }
    },
});