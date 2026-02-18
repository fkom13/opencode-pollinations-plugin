import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';

// --- Color Math (HSL based) ---

interface HSL { h: number; s: number; l: number; }

function hexToHSL(hex: string): HSL {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(baseHex: string, scheme: string, count: number): { hex: string; role: string }[] {
    const base = hexToHSL(baseHex);
    const colors: { hex: string; role: string }[] = [];

    switch (scheme) {
        case 'complementary':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 180) % 360, base.s, base.l), role: 'Complement' });
            // Fill shades
            for (let i = 2; i < count; i++) {
                const lShift = base.l + (i % 2 === 0 ? 15 : -15) * Math.ceil(i / 2);
                colors.push({ hex: hslToHex(base.h, base.s, Math.max(10, Math.min(90, lShift))), role: `Shade ${i - 1}` });
            }
            break;

        case 'analogous':
            for (let i = 0; i < count; i++) {
                const offset = (i - Math.floor(count / 2)) * 30;
                colors.push({
                    hex: hslToHex((base.h + offset + 360) % 360, base.s, base.l),
                    role: offset === 0 ? 'Base' : `${offset > 0 ? '+' : ''}${offset}°`
                });
            }
            break;

        case 'triadic':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 120) % 360, base.s, base.l), role: 'Triad +120°' });
            colors.push({ hex: hslToHex((base.h + 240) % 360, base.s, base.l), role: 'Triad +240°' });
            for (let i = 3; i < count; i++) {
                const lShift = base.l + (i % 2 === 0 ? 12 : -12) * Math.ceil((i - 2) / 2);
                colors.push({ hex: hslToHex((base.h + (i * 120)) % 360, base.s, Math.max(10, Math.min(90, lShift))), role: `Accent ${i - 2}` });
            }
            break;

        case 'split-complementary':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 150) % 360, base.s, base.l), role: 'Split +150°' });
            colors.push({ hex: hslToHex((base.h + 210) % 360, base.s, base.l), role: 'Split +210°' });
            for (let i = 3; i < count; i++) {
                colors.push({ hex: hslToHex(base.h, base.s, Math.max(10, Math.min(90, base.l + (i * 10 - 30)))), role: `Tone ${i - 2}` });
            }
            break;

        case 'monochromatic':
        default:
            for (let i = 0; i < count; i++) {
                const l = Math.round(15 + (i / (count - 1)) * 70); // 15% to 85%
                colors.push({
                    hex: hslToHex(base.h, base.s, l),
                    role: l < base.l ? `Dark ${Math.abs(i - Math.floor(count / 2))}` : l === base.l ? 'Base' : `Light ${Math.abs(i - Math.floor(count / 2))}`,
                });
            }
            // Mark closest to base
            let closestIdx = 0;
            let closestDiff = Infinity;
            colors.forEach((c, i) => {
                const diff = Math.abs(hexToHSL(c.hex).l - base.l);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
            });
            colors[closestIdx].role = 'Base';
            break;
    }

    return colors.slice(0, count);
}

function generateSVG(colors: { hex: string; role: string }[]): string {
    const swatchW = 120;
    const swatchH = 80;
    const gap = 8;
    const totalW = colors.length * (swatchW + gap) - gap + 40;
    const totalH = swatchH + 60;

    const swatches = colors.map((c, i) => {
        const x = 20 + i * (swatchW + gap);
        const textColor = hexToHSL(c.hex).l > 50 ? '#1a1a1a' : '#ffffff';
        return `
    <rect x="${x}" y="20" width="${swatchW}" height="${swatchH}" rx="8" fill="${c.hex}" stroke="#333" stroke-width="1"/>
    <text x="${x + swatchW / 2}" y="${swatchH / 2 + 15}" text-anchor="middle" fill="${textColor}" font-family="monospace" font-size="13" font-weight="bold">${c.hex.toUpperCase()}</text>
    <text x="${x + swatchW / 2}" y="${swatchH + 38}" text-anchor="middle" fill="#666" font-family="sans-serif" font-size="11">${c.role}</text>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" fill="#0d0d0d" rx="12"/>
  ${swatches}
</svg>`;
}

export const genPaletteTool: ToolDefinition = tool({
    description: `Generate a harmonious color palette from a base hex color.
Outputs a visual SVG palette + JSON color codes. Works 100% offline.
Schemes: monochromatic, complementary, analogous, triadic, split-complementary.
Perfect for frontend design, branding, and UI theming.`,

    args: {
        color: tool.schema.string().describe('Base hex color (e.g. "#3B82F6" or "3B82F6")'),
        scheme: tool.schema.enum(['monochromatic', 'complementary', 'analogous', 'triadic', 'split-complementary']).optional()
            .describe('Color harmony scheme (default: analogous)'),
        count: tool.schema.number().min(3).max(8).optional().describe('Number of colors (default: 5, max: 8)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/palettes/'),
    },

    async execute(args, context) {
        const scheme = args.scheme || 'analogous';
        const count = args.count || 5;

        // Normalize hex
        let hex = args.color.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9a-fA-F]{3,6}$/.test(hex)) {
            return `❌ Invalid hex color: "${args.color}". Use format: #3B82F6 or 3B82F6`;
        }
        if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];

        // Generate palette
        const colors = generatePalette(hex, scheme, count);

        const outputDir = resolveOutputDir(TOOL_DIRS.palettes, args.output_path);

        // Save SVG
        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `palette_${hex.replace('#', '')}_${scheme}`;
        const svgPath = path.join(outputDir, `${safeName}.svg`);
        const svg = generateSVG(colors);
        fs.writeFileSync(svgPath, svg);

        // Build CSS custom properties snippet
        const cssVars = colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n');

        context.metadata({ title: `🎨 Palette: ${scheme} from ${hex}` });

        const colorTable = colors.map(c => `  ${c.hex.toUpperCase()}  ${c.role}`).join('\n');

        return [
            `🎨 Color Palette Generated`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `Base: ${hex.toUpperCase()}`,
            `Scheme: ${scheme}`,
            `Colors (${count}):`,
            colorTable,
            ``,
            `File: ${svgPath}`,
            ``,
            `CSS Variables:`,
            `:root {`,
            cssVars,
            `}`,
            ``,
            `Cost: Free (local computation)`,
        ].join('\n');
    },
});
