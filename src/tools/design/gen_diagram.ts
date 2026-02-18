import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';
const MERMAID_INK_BASE = 'https://mermaid.ink';

/**
 * Encode Mermaid code for mermaid.ink API
 * Uses base64 encoding of the diagram definition
 */
function encodeMermaid(code: string): string {
    return Buffer.from(code, 'utf-8').toString('base64url');
}

/**
 * Fetch binary content from URL
 */
function fetchBinary(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'OpenCode-Pollinations-Plugin/6.0' } }, (res) => {
            // Follow redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchBinary(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout fetching diagram'));
        });
    });
}

export const genDiagramTool: ToolDefinition = tool({
    description: `Render a Mermaid diagram to SVG or PNG image. 
Uses mermaid.ink (free, no auth required). Supports all Mermaid syntax:
flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, mindmap, timeline, etc.
The diagram code should be valid Mermaid syntax WITHOUT the \`\`\`mermaid fences.`,

    args: {
        code: tool.schema.string().describe('Mermaid diagram code (e.g. "graph LR; A-->B; B-->C")'),
        format: tool.schema.enum(['svg', 'png']).optional().describe('Output format (default: svg)'),
        theme: tool.schema.enum(['default', 'dark', 'forest', 'neutral']).optional().describe('Diagram theme (default: default)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/diagrams/'),
    },

    async execute(args, context) {
        const format = args.format || 'svg';
        const theme = args.theme || 'default';
        const outputDir = resolveOutputDir(TOOL_DIRS.diagrams, args.output_path);

        // Build mermaid.ink URL
        // For themed rendering, we wrap with config
        const themedCode = theme !== 'default'
            ? `%%{init: {'theme': '${theme}'}}%%\n${args.code}`
            : args.code;

        const encoded = encodeMermaid(themedCode);
        const endpoint = format === 'svg' ? 'svg' : 'img';
        const url = `${MERMAID_INK_BASE}/${endpoint}/${encoded}`;

        // Generate filename
        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `diagram_${Date.now()}`;
        const filePath = path.join(outputDir, `${safeName}.${format}`);

        try {
            const data = await fetchBinary(url);

            if (data.length < 50) {
                return `❌ Diagram Error: mermaid.ink returned empty/invalid response. Check your Mermaid syntax.`;
            }

            fs.writeFileSync(filePath, data);

            const fileSizeKB = (data.length / 1024).toFixed(1);

            // Extract diagram type from first line
            const firstLine = args.code.trim().split('\n')[0].trim();
            const diagramType = firstLine.replace(/[;\s{].*/g, '');

            context.metadata({ title: `📊 Diagram: ${diagramType}` });

            return [
                `📊 Diagram Rendered`,
                `━━━━━━━━━━━━━━━━━━━`,
                `Type: ${diagramType}`,
                `Theme: ${theme}`,
                `Format: ${format.toUpperCase()}`,
                `File: ${filePath}`,
                `Weight: ${fileSizeKB} KB`,
                `URL: ${url}`,
                `Cost: Free (mermaid.ink)`,
            ].join('\n');

        } catch (err: any) {
            return `❌ Diagram Error: ${err.message}\n💡 Verify your Mermaid syntax at https://mermaid.live`;
        }
    },
});
