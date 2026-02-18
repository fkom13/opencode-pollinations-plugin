/**
 * Shared utilities for power tools — file saving, paths, and formatting.
 * All tools use these helpers for consistent behavior.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Default base directory ──────────────────────────────────────────────────

const DEFAULT_BASE = path.join(os.homedir(), 'Downloads', 'pollinations');

/**
 * Subdirectories for each tool category
 */
export const TOOL_DIRS = {
    qrcodes: 'qrcodes',
    diagrams: 'diagrams',
    palettes: 'palettes',
    rembg: 'rembg',
    frames: 'frames',
    audio: 'audio',
    uploads: 'uploads',
} as const;

/**
 * Resolve the output directory — uses customPath if provided,
 * otherwise falls back to ~/Downloads/pollinations/{subdir}
 * Works on all OSes (Linux, macOS, Windows).
 */
export function resolveOutputDir(subdir: string, customPath?: string): string {
    let dir: string;

    if (customPath) {
        // If customPath is absolute, use it directly
        // If relative, resolve from cwd
        dir = path.isAbsolute(customPath)
            ? customPath
            : path.resolve(process.cwd(), customPath);
    } else {
        dir = path.join(DEFAULT_BASE, subdir);
    }

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return dir;
}

/**
 * Format file size for human-readable output
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Sanitize a filename — remove special chars, keep it safe
 */
export function safeName(input: string): string {
    return input.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_');
}

/**
 * Format a timestamp for display (human readable)
 */
export function formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
