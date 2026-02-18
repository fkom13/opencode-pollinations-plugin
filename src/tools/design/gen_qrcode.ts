import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';

export const genQrcodeTool: ToolDefinition = tool({
    description: `Generate a QR code image from text, URL, or WiFi credentials. 
Outputs a PNG file saved locally. Works 100% offline, no API key needed.
Examples: URLs, plain text, WiFi (format: WIFI:T:WPA;S:NetworkName;P:Password;;)`,

    args: {
        content: tool.schema.string().describe('The text, URL, or WiFi string to encode into a QR code'),
        size: tool.schema.number().min(128).max(2048).optional().describe('QR code size in pixels (default: 512)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/qrcodes/'),
    },

    async execute(args, context) {
        const size = args.size || 512;
        const outputDir = resolveOutputDir(TOOL_DIRS.qrcodes, args.output_path);

        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `qr_${Date.now()}`;
        const filePath = path.join(outputDir, `${safeName}.png`);

        try {
            await QRCode.toFile(filePath, args.content, {
                width: size,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });

            const stats = fs.statSync(filePath);
            const fileSizeKB = (stats.size / 1024).toFixed(1);
            const displayContent = args.content.length > 80
                ? args.content.substring(0, 77) + '...'
                : args.content;

            context.metadata({ title: `🔲 QR Code: ${displayContent}` });

            return [
                `🔲 QR Code Généré`,
                `━━━━━━━━━━━━━━━━━━`,
                `Contenu: ${displayContent}`,
                `Taille: ${size}×${size}px`,
                `Fichier: ${filePath}`,
                `Poids: ${fileSizeKB} KB`,
                `Coût: Gratuit (génération locale)`,
            ].join('\n');

        } catch (err: any) {
            return `❌ Erreur QR Code: ${err.message}`;
        }
    },
});
