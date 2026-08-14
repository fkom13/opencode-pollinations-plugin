/**
 * Artifact Core (v6.5) — shared input/output primitives.
 *
 * Extracted from the Free Tools (gen_video_free.resolveAsset/mimeFor,
 * imgtools buildMultipart/getDims) and generalized for Pollinations tools,
 * Free services and local operations.
 *
 * Pipeline: resolveArtifactInput → executeOperation → retrieve bytes
 *           → detectArtifactType (magic bytes) → persistArtifact
 *
 * Invariant: saved extension follows REAL detected bytes, never a
 * caller-requested format (a b64 edit response can be JPEG while the
 * caller assumes PNG — see Phase 2 live evidence T14).
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ResolvedAsset {
    buf: Buffer;
    mime: string;
    ext: string;
    filename: string;
}

export interface DetectedArtifact {
    format: string;
    ext: string;
    mime: string;
}

/** Magic-bytes detection. Returns null when the format is unknown. */
export function detectArtifactType(buf: Buffer): DetectedArtifact | null {
    if (!buf || buf.length < 4) return null;
    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { format: 'jpeg', ext: 'jpg', mime: 'image/jpeg' };
    }
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { format: 'png', ext: 'png', mime: 'image/png' };
    }
    // GIF
    if (buf.toString('ascii', 0, 3) === 'GIF') {
        return { format: 'gif', ext: 'gif', mime: 'image/gif' };
    }
    // WebP
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
        return { format: 'webp', ext: 'webp', mime: 'image/webp' };
    }
    // glTF binary (GLB) — magic 'glTF' (0x676C5446)
    if (buf.toString('ascii', 0, 4) === 'glTF') {
        return { format: 'glb', ext: 'glb', mime: 'model/gltf-binary' };
    }
    // MP4 (ftyp box at offset 4)
    if (buf.length > 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
        return { format: 'mp4', ext: 'mp4', mime: 'video/mp4' };
    }
    // WebM (EBML magic)
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
        return { format: 'webm', ext: 'webm', mime: 'video/webm' };
    }
    // MP3 (ID3 tag or MPEG frame sync)
    if (buf.length > 3 && (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))) {
        return { format: 'mp3', ext: 'mp3', mime: 'audio/mpeg' };
    }
    // WAV
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
        return { format: 'wav', ext: 'wav', mime: 'audio/wav' };
    }
    // OGG
    if (buf.toString('ascii', 0, 4) === 'OggS') {
        return { format: 'ogg', ext: 'ogg', mime: 'audio/ogg' };
    }
    // JSON (fallback for text artifacts)
    if (buf.length > 0 && (buf[0] === 0x7b || buf[0] === 0x5b)) {
        return { format: 'json', ext: 'json', mime: 'application/json' };
    }
    return null;
}

const EXT_MIME: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', glb: 'model/gltf-binary', mp4: 'video/mp4', webm: 'video/webm',
    mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    m4a: 'audio/mp4', flac: 'audio/flac', txt: 'text/plain', json: 'application/json',
};

export function mimeForExt(ext: string): string {
    return EXT_MIME[ext.toLowerCase()] || 'application/octet-stream';
}

export function mimeFor(ext: string, kind: 'image' | 'audio' | 'video' | 'model'): string {
    const e = ext.toLowerCase();
    const known = EXT_MIME[e];
    if (known) return known;
    if (kind === 'image') return 'image/jpeg';
    if (kind === 'audio') return 'audio/mpeg';
    if (kind === 'video') return 'video/mp4';
    return 'application/octet-stream';
}

/**
 * Resolve an asset input (local path | http(s) URL | data: URI) into a
 * Buffer + mime + filename. URL downloads are bounded (60s default).
 */
export async function resolveArtifactInput(
    input: string,
    kind: 'image' | 'audio' | 'video' | 'model' = 'image',
    timeoutMs: number = 60000
): Promise<ResolvedAsset> {
    // data: URI
    const dataMatch = input.match(/^data:([^;]+);base64,(.+)$/);
    if (dataMatch) {
        const mime = dataMatch[1];
        const ext = (mime.split('/')[1] || 'bin').toLowerCase();
        return { buf: Buffer.from(dataMatch[2], 'base64'), mime, ext, filename: `${kind}.${ext}` };
    }

    // http(s) URL — bounded fetch
    if (/^https?:\/\//i.test(input)) {
        const res = await fetch(input, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new Error(`Asset download failed: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const urlExt = (input.split('?')[0].split('.').pop() || 'bin').toLowerCase();
        const detected = detectArtifactType(buf);
        const ext = detected ? detected.ext : urlExt;
        const mime = detected ? detected.mime : mimeFor(urlExt, kind);
        return { buf, mime, ext, filename: `${kind}.${ext}` };
    }

    // local file
    if (fs.existsSync(input)) {
        const buf = fs.readFileSync(input);
        const detected = detectArtifactType(buf);
        const nameExt = path.extname(input).toLowerCase().replace('.', '') || 'bin';
        const ext = detected ? detected.ext : nameExt;
        const mime = detected ? detected.mime : mimeFor(nameExt, kind);
        return { buf, mime, ext, filename: path.basename(input) };
    }

    throw new Error(`Asset not found: ${input}`);
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

export interface PersistOptions {
    outputDir: string;
    filename?: string;
    preferredExt?: string;
    /** When true (default), real magic bytes override the preferred extension. */
    detectExt?: boolean;
}

export interface PersistedArtifact {
    filePath: string;
    size: number;
    detected: DetectedArtifact | null;
    ext: string;
}

/**
 * Persist artifact bytes. The written extension follows the DETECTED magic
 * bytes (detectExt !== false) — never a blind caller assumption.
 */
export function persistArtifact(buf: Buffer, opts: PersistOptions): PersistedArtifact {
    const detected = opts.detectExt === false ? null : detectArtifactType(buf);
    const ext = detected?.ext ?? opts.preferredExt ?? 'bin';

    if (!fs.existsSync(opts.outputDir)) {
        fs.mkdirSync(opts.outputDir, { recursive: true });
    }

    let filename = opts.filename ? sanitizeFilename(opts.filename) : undefined;
    if (!filename) {
        filename = `artifact_${Date.now()}.${ext}`;
    } else if (opts.detectExt !== false && detected) {
        // STRICT: the written extension follows the real bytes — a caller
        // filename like my_image.png becomes my_image.jpg for JPEG bytes.
        // Filesystem path and returned ext always agree.
        const dotIdx = filename.lastIndexOf('.');
        if (dotIdx > 0) {
            filename = filename.slice(0, dotIdx) + '.' + ext;
        } else {
            filename = `${filename}.${ext}`;
        }
    } else if (!filename.includes('.')) {
        filename = `${filename}.${ext}`;
    }

    const filePath = path.join(opts.outputDir, filename);
    fs.writeFileSync(filePath, buf);
    return { filePath, size: buf.length, detected, ext };
}
