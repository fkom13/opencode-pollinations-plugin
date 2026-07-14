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

export const imageUpscalerTool: ToolDefinition = tool({
    description: `Agrandit une image 2x ou 4x (gratuit, appel direct).
Temps de traitement : 30-120s. Pas de clé requise.`,

    args: {
        file: tool.schema.string().describe('Chemin local de l\'image à agrandir'),
        ratio: tool.schema.enum(['2', '4']).optional().describe('Facteur d\'agrandissement (2=2x, 4=4x). Défaut: 2'),
        save_to: tool.schema.string().optional().describe('Dossier de sortie'),
        filename: tool.schema.string().optional().describe('Nom du fichier de sortie (sans extension)'),
    },

    async execute(args, context) {
        const imagePath = args.file;
        if (!fs.existsSync(imagePath)) {
            return t('tools.image_upscaler.file_not_found', { path: imagePath }) || `❌ Fichier introuvable : ${imagePath}`;
        }

        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const imageData = fs.readFileSync(imagePath);
        const ratio = args.ratio === '4' ? '400' : '200';
        const ratioLabel = args.ratio === '4' ? '4x' : '2x';

        context.metadata({ title: '📐 image_upscaler', metadata: { type: 'info', message: `Agrandissement ${ratioLabel}...` } });

        try {
            const result = await processTool('upscale', {
                data: imageData,
                contentType: mimeType,
                filename: path.basename(imagePath),
                options: { ratio },
            });

            if (!result.imageUrl) {
                return t('tools.image_upscaler.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('image_upscaler');
            const outputFilename = (args.filename ? sanitizeFilename(args.filename) : generateFilename('upscale', 'imgupscaler', 'png'));
            const filePath = path.join(outputDir, outputFilename.includes('.') ? outputFilename : `${outputFilename}.png`);

            ensureDir(outputDir);
            fs.writeFileSync(filePath, dl.data);
    emitStatusToast("success", "📐 Upscale terminé", "image_upscaler", { filePath, freeTool: true });

            const fileSize = fs.statSync(filePath).size;

            const lines: string[] = [];
            lines.push('📐 **Image Agrandie**');
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(`Fichier : \`${filePath}\``);
            lines.push(`Taille  : ${formatFileSize(fileSize)}`);
            lines.push(`Ratio   : ${ratioLabel}`);
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "image_upscaler", { freeTool: true });
            return "❌ Erreur : " + err.message;
        }
    },
});