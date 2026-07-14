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

export const imageEnhancerTool: ToolDefinition = tool({
    description: `Améliore la qualité d'une image : réduction du bruit, netteté, restauration des détails (gratuit, appel direct).
Résolutions : 1K (1024px), 2K (2048px), 4K (4096px). Défaut : 2K.
Temps de traitement : 30-120s. Pas de clé requise.`,

    args: {
        file: tool.schema.string().describe('Chemin local de l\'image à améliorer'),
        target_longest_side: tool.schema.enum(['1024', '2048', '4096']).optional().describe('Résolution cible (1K=1024, 2K=2048, 4K=4096). Défaut: 2048'),
        save_to: tool.schema.string().optional().describe('Dossier de sortie'),
        filename: tool.schema.string().optional().describe('Nom du fichier de sortie (sans extension)'),
    },

    async execute(args, context) {
        const imagePath = args.file;
        if (!fs.existsSync(imagePath)) {
            return t('tools.image_enhancer.file_not_found', { path: imagePath }) || `❌ Fichier introuvable : ${imagePath}`;
        }

        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const imageData = fs.readFileSync(imagePath);
        const targetLongestSide = parseInt(args.target_longest_side || '2048');
        const resLabel = targetLongestSide >= 4096 ? '4K' : targetLongestSide >= 2048 ? '2K' : '1K';

        context.metadata({ title: '✨ image_enhancer', metadata: { type: 'info', message: `Amélioration ${resLabel}...` } });

        try {
            const result = await processTool('enhance', {
                data: imageData,
                contentType: mimeType,
                filename: path.basename(imagePath),
                options: { targetLongestSide },
            });

            if (!result.imageUrl) {
                return t('tools.image_enhancer.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('image_enhancer');
            const outputFilename = (args.filename ? sanitizeFilename(args.filename) : generateFilename('enhance', 'imgupscaler', 'png'));
            const filePath = path.join(outputDir, outputFilename.includes('.') ? outputFilename : `${outputFilename}.png`);

            ensureDir(outputDir);
            fs.writeFileSync(filePath, dl.data);
    emitStatusToast("success", "✨ Enhancement terminé", "image_enhancer", { filePath, freeTool: true });

            const fileSize = fs.statSync(filePath).size;

            const lines: string[] = [];
            lines.push('✨ **Image Améliorée**');
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(`Fichier      : \`${filePath}\``);
            lines.push(`Taille       : ${formatFileSize(fileSize)}`);
            lines.push(`Résolution   : ${resLabel}`);
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "image_enhancer", { freeTool: true });
            return "❌ Erreur : " + err.message;
        }
    },
});