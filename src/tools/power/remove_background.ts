import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { emitStatusToast } from '../../server/toast.js';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, formatFileSize, TOOL_DIRS } from '../shared.js';

// ─── Provider Defaults ───────────────────────────────────────────────────────

const CUT_API_URL = 'https://cut.esprit-artificiel.com';
const CUT_API_KEY = 'REDACTED';
const BACKGROUNDCUT_API_URL = 'https://backgroundcut.co/api/v1/cut/';

// ─── Key Storage ─────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(
    process.env.HOME || process.env.USERPROFILE || '/tmp',
    '.pollinations', 'backgroundcut_keys.json'
);

interface KeyStore {
    keys: string[];
    currentIndex: number;
}

function loadKeys(): KeyStore {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
        }
    } catch { }
    return { keys: [], currentIndex: 0 };
}

function getRotatedKeys(): string[] {
    const store = loadKeys();
    if (store.keys.length === 0) return [];

    // Return keys starting from currentIndex looping back to start
    const before = store.keys.slice(store.currentIndex);
    const after = store.keys.slice(0, store.currentIndex);
    return [...before, ...after];
}

function advanceKeyIndex(): void {
    const store = loadKeys();
    if (store.keys.length === 0) return;
    store.currentIndex = (store.currentIndex + 1) % store.keys.length;
    try {
        const dir = path.dirname(KEYS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2));
    } catch { }
}


// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function httpRequest(url: string, options: https.RequestOptions, body?: Buffer): Promise<{ statusCode: number; body: Buffer; json?: any }> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
                const responseBody = Buffer.concat(chunks);
                const statusCode = res.statusCode || 500;
                let json: any;
                try { json = JSON.parse(responseBody.toString()); } catch { }
                resolve({ statusCode, body: responseBody, json });
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout (60s)')); });
        if (body) req.write(body);
        req.end();
    });
}

function downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : require('http');
        protocol.get(url, (res: any) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location).then(resolve).catch(reject);
            }
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

// ─── Helper: Get Image Size (Linux/Unix 'file' command) ─────────────────────

function getImageSize(filePath: string): { width: number; height: number } | null {
    try {
        const { execSync } = require('child_process');
        const output = execSync(`file "${filePath}"`).toString();
        // Regex for "IDAT, 800 x 600," or ", 800 x 600,"
        const match = output.match(/, (\d+) ?x ?(\d+),/);
        if (match) {
            return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
    } catch (e) {
        // Fallback or silence
    }
    return null;
}

// ─── Provider: cut.esprit-artificiel.com (returns binary PNG directly) ────────

async function removeViaCut(imageData: Buffer, filename: string, mimeType: string): Promise<Buffer> {
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(imageData);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const url = new URL(`${CUT_API_URL}/remove-bg`);
    const res = await httpRequest(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'X-Api-Key': CUT_API_KEY,
            'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
        },
    }, body);

    if (res.statusCode >= 400) {
        throw new Error(`CUT API Error ${res.statusCode}: ${res.body.toString().substring(0, 200)}`);
    }
    return res.body;
}

// ─── Provider: BackgroundCut.co (returns JSON with output_image_url) ─────────

async function removeViaBackgroundCut(
    imageData: Buffer,
    filename: string,
    mimeType: string,
    apiKey: string,
    quality: string = 'medium',
    returnFormat: string = 'png',
    maxResolution?: number
): Promise<Buffer> {
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    // File field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(imageData);

    // Quality
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\n${quality}`));

    // Return format
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="return_format"\r\n\r\n${returnFormat.toUpperCase()}`));

    // Max resolution
    if (maxResolution) {
        parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="max_resolution"\r\n\r\n${maxResolution}`));
    }

    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const res = await httpRequest(BACKGROUNDCUT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'Authorization': `Token ${apiKey}`,
            'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
        },
    }, body);

    // Error handling with specific codes
    if (res.statusCode === 401) throw new Error('BGCUT_401:Invalid or missing API key');
    if (res.statusCode === 402) throw new Error('BGCUT_402:No credits remaining');
    if (res.statusCode === 429) throw new Error('BGCUT_429:Rate limit exceeded');
    if (res.statusCode === 413) throw new Error('BGCUT_413:File too large (max 12MB)');
    if (res.statusCode >= 400) {
        const msg = res.json?.error || res.body.toString().substring(0, 200);
        throw new Error(`BGCUT_${res.statusCode}:${msg}`);
    }

    // Download the result image from the URL
    const outputUrl = res.json?.output_image_url;
    if (!outputUrl) throw new Error('BackgroundCut returned no output URL');

    return await downloadFile(outputUrl);
}

// ─── Main Tool ───────────────────────────────────────────────────────────────

export const removeBackgroundTool: ToolDefinition = tool({
    description: `Remove the background from an image, producing a transparent PNG or WebP.

**Providers:**
- \`cut\` (default free) — Built-in u2netp AI. Slower. Ignores quality/format/resolution.
- \`backgroundcut\` — Premium API. Requires API key. Supports all parameters.

**Setup:** Use \`rmbg_keys\` tool to manage API keys.
**Auto mode:** Uses BackgroundCut if key is available, falls back to cut.`,

    args: {
        image_path: tool.schema.string().describe('Absolute path to the image file'),
        filename: tool.schema.string().optional().describe('Custom output filename (e.g. "my_image.png") or name without extension'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/rembg/'),
        provider: tool.schema.string().optional().describe('Provider: "auto" (default), "cut" (free), or "backgroundcut" (premium)'), // Removed .enum() as it caused errors
        api_key: tool.schema.string().optional().describe('BackgroundCut API key (overrides stored keys)'),
        quality: tool.schema.string().optional().describe('BackgroundCut only: "low", "medium" (default), "high"'),
        return_format: tool.schema.string().optional().describe('BackgroundCut only: "png" (default), "webp"'),
        max_resolution: tool.schema.number().optional().describe('BackgroundCut only: Max output resolution in pixels'),
    },

    async execute(args, context) {
        // ── Validate input ──
        if (!fs.existsSync(args.image_path)) {
            return `❌ File not found: ${args.image_path}`;
        }

        const ext = path.extname(args.image_path).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            return `❌ Unsupported format: ${ext}. Use PNG, JPEG, or WebP.`;
        }

        const inputStats = fs.statSync(args.image_path);
        if (inputStats.size > 12 * 1024 * 1024) {
            return `❌ File too large (${formatFileSize(inputStats.size)}). Max: 12MB`;
        }

        // ── Resolve provider ──
        const provider = (args.provider || 'auto') as string;
        const quality = (args.quality || 'medium') as string;
        const returnFormat = (args.return_format || 'png') as string;
        const imageData = fs.readFileSync(args.image_path);
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        const basename = path.basename(args.image_path);

        // ─── Resolve API keys ──
        let keysToCheck: string[] = [];
        if (args.api_key) {
            keysToCheck = [args.api_key];
        } else {
            keysToCheck = getRotatedKeys();
        }

        // ── Determine initial provider strategy ──
        // If specific provider requested, we stick to it (unless auto fallback)
        // If auto, we try keys then fallback to cut

        let effectiveProvider = provider;
        if (provider === 'auto') {
            // If we have keys, start with backgroundcut, else cut
            effectiveProvider = keysToCheck.length > 0 ? 'backgroundcut' : 'cut';
        }

        // ── Info message when no BackgroundCut key ──
        if (keysToCheck.length === 0 && (provider === 'auto' || provider === 'backgroundcut')) {
            // console.log("No BackgroundCut key found. Using free provider."); // SILENCED
            context.metadata({
                title: "RMBG (Free)",
                metadata: { type: 'info', message: "Mode Gratuit (Pas de clé détectée)" }
            });
            const noKeyMsg = [
                `ℹ️ **No BackgroundCut API key configured** — using free provider (slower, rate-limited).`,
                ``,
                `🚀 **Want faster, higher-quality results?**`,
                `1. Sign up at https://backgroundcut.co (5$ free credits, 60 days)`,
                `2. Run: \`rmbg_keys action=add key=YOUR_API_KEY\``,
                `3. Multiple keys supported — they rotate automatically!`,
            ].join('\n');

            if (provider === 'backgroundcut' && !args.api_key) {
                return `❌ BackgroundCut provider selected but no API keys stored.\n\n${noKeyMsg}`;
            }
            // In auto mode, we continue with free provider
            context.metadata({ title: `ℹ️ Using free provider (no BackgroundCut key)` });
        }

        // ── Resolve output filename ──
        const outputDir = resolveOutputDir(TOOL_DIRS.rembg, args.output_path);
        let finalFilename = '';

        const targetExt = (returnFormat === 'webp' && effectiveProvider === 'backgroundcut') ? '.webp' : '.png';

        if (args.filename) {
            if (args.filename.toLowerCase().endsWith(targetExt)) {
                finalFilename = args.filename;
            } else if (args.filename.match(/\.[a-z0-9]+$/i)) {
                // Force proper extension
                finalFilename = args.filename.replace(/\.[a-z0-9]+$/i, targetExt);
            } else {
                finalFilename = `${args.filename}${targetExt}`;
            }
        } else {
            finalFilename = `${path.basename(args.image_path, ext)}_nobg${targetExt}`;
        }

        const outputPath = path.join(outputDir, finalFilename);
        const outputExt = path.extname(outputPath).replace('.', ''); // Fix for log display

        // ── Execute ──
        try {
            let resultBuffer: Buffer | null = null;
            let usedProvider = 'cut'; // Default
            let fallbackUsed = false;
            let successKey = '';

            // 1. Try BackgroundCut loop if applicable
            if (effectiveProvider === 'backgroundcut' && keysToCheck.length > 0) {
                emitStatusToast('info', `Démarrage: ${basename}`, '✂️ BackgroundCut');

                for (const key of keysToCheck) {
                    try {
                        emitStatusToast('info', `Clé ${key.substring(0, 8)}...`, '>>> Rotation RMBG');
                        // console.log(`[RMBG] Trying key ${key.substring(0, 8)}...`); // SILENCED
                        resultBuffer = await removeViaBackgroundCut(
                            imageData, basename, mimeType,
                            key, quality, returnFormat, args.max_resolution
                        );

                        // Success!
                        usedProvider = 'backgroundcut';
                        successKey = key;

                        // Advance index globally so next call uses next key (fair rotation)
                        advanceKeyIndex();

                        // Only set final metadata on success
                        context.metadata({
                            title: "RMBG (Premium)",
                            metadata: { type: 'success', message: "Détourage HD réussi (BackgroundCut)" }
                        });
                        break; // Exit loop on success

                    } catch (err: any) {
                        const isFallbackable = err.message.startsWith('BGCUT_402') ||
                            err.message.startsWith('BGCUT_429') ||
                            err.message.startsWith('BGCUT_401');

                        if (isFallbackable) {
                            // console.log(`⚠️ Key ${key.substring(0, 8)} failed (${err.message}). Rotating...`); // SILENCED
                            continue; // Try next key
                        } else {
                            throw err; // Fatal error (file size etc)
                        }
                    }
                }
            }

            // 2. Fallback to Free Provider if no result yet
            if (!resultBuffer) {
                if (effectiveProvider === 'backgroundcut' && provider !== 'auto') {
                    throw new Error('All provided keys failed or are expired.');
                }

                if (effectiveProvider === 'backgroundcut') {
                    emitStatusToast('warning', 'Toutes les clés ont échoué. Mode Gratuit activé.', '⚠️ Fallback');
                    // console.log('⚠️ All BackgroundCut keys failed. Falling back to free provider.'); // SILENCED
                    fallbackUsed = true;
                } else {
                    emitStatusToast('info', `Détourage via API Gratuite: ${basename}`, '✂️ Free RMBG');
                }

                resultBuffer = await removeViaCut(imageData, basename, mimeType);

                context.metadata({
                    title: "RMBG (Free)",
                    metadata: { type: 'success', message: "Détourage Standard réussi" }
                });
                usedProvider = 'cut (free)';
            }

            if (!resultBuffer || resultBuffer.length < 100) {
                return `❌ Background removal returned invalid data.`;
            }

            const finalPath = path.resolve(outputPath);
            fs.writeFileSync(finalPath, resultBuffer);

            // Double check existence
            if (!fs.existsSync(finalPath)) {
                throw new Error(`File write failed at: ${finalPath}`);
            }

            const dims = getImageSize(finalPath);
            const dimStr = dims ? `${dims.width}×${dims.height}` : 'N/A';

            const lines = [
                `✂️ Background Removed`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `Input: ${basename} (${formatFileSize(inputStats.size)})`,
                `Output: ${finalPath}`,
                `Size: ${formatFileSize(resultBuffer.length)}`,
                `Dimensions: ${dimStr}`,
                `Format: ${outputExt.toUpperCase()} (transparent)`,
                `Provider: ${usedProvider}`,
                `Cost: Free`,
            ];

            if (fallbackUsed) {
                lines.push(``, `⚠️ BackgroundCut key may be expired/rate-limited. Check with \`rmbg_keys action=list\``);
            }

            // Add info message for users without key
            if (keysToCheck.length === 0 && usedProvider.includes('free')) {
                lines.push(``, `💡 Tip: Add a BackgroundCut key for faster HD results: \`rmbg_keys action=add key=...\``);
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message.includes('429') || err.message.includes('rate')) {
                return `⏳ Rate limited. Please try again in 30 seconds.`;
            }
            if (err.message.startsWith('BGCUT_402')) {
                return `💳 BackgroundCut: No credits remaining. Add a new key or wait for renewal.\nRun: \`rmbg_keys action=add key=...\``;
            }
            return `❌ Background Removal Error: ${err.message}`;
        }
    },
});
