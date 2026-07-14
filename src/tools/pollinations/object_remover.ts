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

export const objectRemoverTool: ToolDefinition = tool({
    description: `Supprime un objet d'une image via un prompt (gratuit, appel direct). 
Exemples : "remove the person", "erase the text", "delete the car". 
Temps de traitement : 30-120s. Pas de clé requise.`,

    args: {
        file: tool.schema.string().describe('Chemin local de l\'image à traiter'),
        prompt: tool.schema.string().describe('Description de l\'objet à supprimer (ex: "remove the red car")'),
        save_to: tool.schema.string().optional().describe('Dossier de sortie'),
        filename: tool.schema.string().optional().describe('Nom du fichier de sortie (sans extension)'),
    },

    async execute(args, context) {
        const imagePath = args.file;
        if (!fs.existsSync(imagePath)) {
            return t('tools.object_remover.file_not_found', { path: imagePath }) || `❌ Fichier introuvable : ${imagePath}`;
        }

        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const imageData = fs.readFileSync(imagePath);
        const prompt = args.prompt || 'remove unwanted objects';

        context.metadata({ title: '🧹 object_remover', metadata: { type: 'info', message: `Suppression de "${prompt}"...` } });

        try {
            const result = await processTool('ruo', {
                data: imageData,
                contentType: mimeType,
                filename: path.basename(imagePath),
                options: { prompt },
            });

            if (!result.imageUrl) {
                return t('tools.object_remover.no_result') || '❌ Aucun résultat reçu.';
            }

            const dl = await httpsGet(result.imageUrl);
            const outputDir = args.save_to ? args.save_to : getDefaultOutputDir('object_remover');
            const outputFilename = (args.filename ? sanitizeFilename(args.filename) : generateFilename('ruo', 'object-remover', 'png'));
            const filePath = path.join(outputDir, outputFilename.includes('.') ? outputFilename : `${outputFilename}.png`);

            ensureDir(outputDir);
            fs.writeFileSync(filePath, dl.data);
    emitStatusToast("success", "🧹 Objet supprimé", "object_remover", { filePath, freeTool: true });
    emitStatusToast('success', '🧹 Objet supprimé', 'object_remover', { filePath, freeTool: true });

            const fileSize = fs.statSync(filePath).size;


            const lines: string[] = [];
            lines.push('🧹 **Objet Supprimé**');
            lines.push('━━━━━━━━━━━━━━━━━━');
            lines.push(`Fichier : \`${filePath}\``);
            lines.push(`Taille  : ${formatFileSize(fileSize)}`);
            lines.push(`Prompt  : ${prompt}`);
            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast("warning", "❌ " + (err.message?.substring(0, 80) || ""), "object_remover", { freeTool: true });
            return "❌ Erreur : " + err.message;
        }
    },
});