// imgtools/helpers.ts — HTTP, multipart, image dimensions
// Adapté depuis /home/fkomp/Bureau/oracle/dev-serveur/iamges-tools-api/modules/helpers.js

import * as https from 'https';
import * as crypto from 'crypto';

export function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

export function buildMultipart(fields: Array<{ name: string; value: Buffer | string; filename?: string; contentType?: string }>): { boundary: string; body: Buffer } {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const parts: Buffer[] = [];
    for (const f of fields) {
        let h = `--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"`;
        if (f.filename) {
            h += `; filename="${f.filename}"\r\nContent-Type: ${f.contentType || 'application/octet-stream'}\r\n\r\n`;
            parts.push(Buffer.from(h));
            parts.push(typeof f.value === 'string' ? Buffer.from(f.value) : f.value);
            parts.push(Buffer.from('\r\n'));
        } else {
            h += `\r\n\r\n${f.value}\r\n`;
            parts.push(Buffer.from(h));
        }
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    return { boundary, body: Buffer.concat(parts) };
}

export function httpsPost(host: string, path: string, headers: Record<string, string>, body: Buffer | string): Promise<{ status: number; body: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: host,
            path,
            method: 'POST',
            headers: {
                'Content-Length': Buffer.byteLength(body),
                ...headers,
            },
            timeout: 120000,
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                resolve({
                    status: res.statusCode || 0,
                    body: Buffer.concat(chunks),
                    headers: res.headers as Record<string, string>,
                });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (typeof body === 'string') req.write(body);
        else req.write(body);
        req.end();
    });
}

export function getDims(buf: Buffer): { width: number; height: number } | null {
    try {
        // PNG
        if (buf[0] === 0x89 && buf[1] === 0x50) {
            return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
        }
        // JPEG
        if (buf[0] === 0xff && buf[1] === 0xd8) {
            let offset = 2;
            while (offset < buf.length) {
                if (buf[offset] !== 0xff) break;
                const marker = buf[offset + 1];
                if (marker === 0xc0 || marker === 0xc2) {
                    return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
                }
                offset += 2 + buf.readUInt16BE(offset + 2);
            }
        }
        return null;
    } catch { return null; }
}

export function aspectRatio(w: number, h: number): string {
    if (w === 0 || h === 0) return '1:1';
    const r = w / h;
    if (r > 1.7) return '16:9';
    if (r > 1.2) return '4:3';
    if (r > 0.8) return '1:1';
    if (r > 0.55) return '3:4';
    return '9:16';
}

export async function dlImage(url: string): Promise<{ body: Buffer; contentType: string }> {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 15000 }, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`Download failed: ${res.statusCode}`));
            }
            const chunks: Buffer[] = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({
                body: Buffer.concat(chunks),
                contentType: res.headers['content-type'] || 'image/png',
            }));
        }).on('error', reject);
    });
}