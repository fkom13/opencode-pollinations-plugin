import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// ─── Provider Definitions ───────────────────────────────────────────────────

interface UploadProvider {
    name: string;
    maxSize: number;   // bytes
    expiry: string;
    upload: (filePath: string, fileName: string, fileData: Buffer, mimeType: string, expiry: string) => Promise<string>;
}

const PROVIDERS: UploadProvider[] = [
    // Provider 1: Litterbox (catbox.moe) — fiable, anonyme, testé OK
    {
        name: 'litterbox.catbox.moe',
        maxSize: 200 * 1024 * 1024, // 200MB
        expiry: '1h-72h',
        upload: (filePath, fileName, fileData, mimeType, expiry) => httpUpload({
            url: 'https://litterbox.catbox.moe/resources/internals/api.php',
            fields: { reqtype: 'fileupload', time: expiry },
            fileField: 'fileToUpload',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const trimmed = body.trim();
                if (trimmed.startsWith('https://')) return trimmed;
                throw new Error(`Réponse inattendue: ${trimmed.substring(0, 100)}`);
            },
        }),
    },

    // Provider 2: tmpfile.link — CDN rapide, 100MB max, 7j
    {
        name: 'tmpfile.link',
        maxSize: 100 * 1024 * 1024, // 100MB
        expiry: '7 jours',
        upload: (filePath, fileName, fileData, mimeType) => httpUpload({
            url: 'https://tmpfile.link/api/upload',
            fields: {},
            fileField: 'file',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const json = JSON.parse(body);
                if (json.downloadLink) return json.downloadLink;
                throw new Error(`Pas de downloadLink: ${body.substring(0, 100)}`);
            },
        }),
    },

    // Provider 3: file.io — auto-destruction après 1er téléchargement
    {
        name: 'file.io',
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB
        expiry: '14 jours (auto-détruit)',
        upload: (filePath, fileName, fileData, mimeType) => httpUpload({
            url: 'https://file.io',
            fields: { expires: '14d' },
            fileField: 'file',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const json = JSON.parse(body);
                if (json.success && json.link) return json.link;
                throw new Error(`file.io erreur: ${json.message || body.substring(0, 100)}`);
            },
        }),
    },
];

// ─── Generic HTTP Multipart Upload (zero deps) ─────────────────────────────

interface HttpUploadOptions {
    url: string;
    fields: Record<string, string>;
    fileField: string;
    fileName: string;
    fileData: Buffer;
    mimeType: string;
    parseResponse: (body: string) => string;
}

function httpUpload(opts: HttpUploadOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
        const parts: Buffer[] = [];

        // Text fields
        for (const [key, value] of Object.entries(opts.fields)) {
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
            ));
        }

        // File field
        parts.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${opts.fileField}"; filename="${opts.fileName}"\r\nContent-Type: ${opts.mimeType}\r\n\r\n`
        ));
        parts.push(opts.fileData);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);
        const url = new URL(opts.url);
        const isHttps = url.protocol === 'https:';
        const mod = isHttps ? https : http;

        const req = mod.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
                'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)',
                'Accept': 'application/json, text/plain, */*',
            },
        }, (res) => {
            // Follow redirects (301, 302, 307)
            if (res.statusCode && [301, 302, 307].includes(res.statusCode) && res.headers.location) {
                httpUpload({ ...opts, url: res.headers.location }).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(opts.parseResponse(data));
                    } catch (err: any) {
                        reject(new Error(`Parse error: ${err.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', (err) => reject(new Error(`Réseau: ${err.message}`)));
        req.setTimeout(45000, () => {
            req.destroy();
            reject(new Error('Timeout (45s)'));
        });
        req.write(body);
        req.end();
    });
}

// ─── Upload with Cascade Fallback ───────────────────────────────────────────

async function uploadWithFallback(
    filePath: string,
    fileSize: number,
    expiry: string
): Promise<{ url: string; provider: string; expiry: string; attempts: string[] }> {
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const mimeType = getMimeType(fileName);
    const attempts: string[] = [];

    for (const provider of PROVIDERS) {
        if (fileSize > provider.maxSize) {
            attempts.push(`⏭️ ${provider.name}: fichier trop gros (max ${formatFileSize(provider.maxSize)})`);
            continue;
        }

        try {
            const url = await provider.upload(filePath, fileName, fileData, mimeType, expiry);
            return { url, provider: provider.name, expiry: provider.expiry, attempts };
        } catch (err: any) {
            attempts.push(`❌ ${provider.name}: ${err.message}`);
        }
    }

    throw new Error(
        `Tous les services d'upload ont échoué:\n${attempts.join('\n')}`
    );
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
        '.pdf': 'application/pdf', '.txt': 'text/plain',
        '.json': 'application/json', '.html': 'text/html', '.css': 'text/css',
        '.js': 'application/javascript', '.ts': 'text/typescript',
        '.zip': 'application/zip', '.tar': 'application/x-tar',
        '.gz': 'application/gzip', '.7z': 'application/x-7z-compressed',
    };
    return types[ext] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const fileToUrlTool: ToolDefinition = tool({
    description: `Upload a local file to get a temporary public URL.
Uses a resilient multi-provider system with automatic fallback:
  1. litterbox.catbox.moe (200MB, 1h-72h, anonymous)
  2. tmpfile.link (100MB, 7 days, CDN global)
  3. file.io (2GB, auto-destruct after 1 download)
If one service is down, the next one is tried automatically.
No API key needed, no account required.`,

    args: {
        file_path: tool.schema.string().describe('Absolute path to the local file to upload'),
        expiry: tool.schema.enum(['1h', '12h', '24h', '72h']).optional()
            .describe('How long the URL stays active on primary provider (default: 24h)'),
    },

    async execute(args, context) {
        const expiry = args.expiry || '24h';

        // Validate file exists
        if (!fs.existsSync(args.file_path)) {
            return `❌ Fichier introuvable: ${args.file_path}`;
        }

        const stats = fs.statSync(args.file_path);
        if (stats.size === 0) {
            return `❌ Fichier vide: ${args.file_path}`;
        }
        if (stats.size > 2 * 1024 * 1024 * 1024) {
            return `❌ Fichier trop volumineux (${formatFileSize(stats.size)}). Max: 2 GB`;
        }

        try {
            context.metadata({ title: `📤 Upload: ${path.basename(args.file_path)}` });

            const result = await uploadWithFallback(args.file_path, stats.size, expiry);

            const lines = [
                `📤 Fichier Uploadé`,
                `━━━━━━━━━━━━━━━━━━`,
                `Fichier: ${path.basename(args.file_path)}`,
                `Taille: ${formatFileSize(stats.size)}`,
                `URL: ${result.url}`,
                `Service: ${result.provider}`,
                `Expiration: ${result.expiry}`,
                ``,
                `Coût: Gratuit (hébergement anonyme)`,
            ];

            // Show fallback attempts if any
            if (result.attempts.length > 0) {
                lines.push('', '⚠️ Fallbacks utilisés:');
                lines.push(...result.attempts);
            }

            return lines.join('\n');

        } catch (err: any) {
            return `❌ Erreur Upload: ${err.message}`;
        }
    },
});
