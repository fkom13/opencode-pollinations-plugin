import { spawnSync } from 'child_process';
import * as os from 'os';

/**
 * Check if ffmpeg is available in the system PATH
 */
export function hasSystemFFmpeg(): boolean {
    const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}

/**
 * Check if ffprobe is available in the system PATH
 */
export function hasSystemFFprobe(): boolean {
    const result = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}

/**
 * Get cross-platform installation instructions
 */
export function getFFmpegInstallInstructions(): string {
    const platform = process.platform;
    const instructions: Record<string, string> = {
        linux: 'sudo apt install ffmpeg  (Debian/Ubuntu)\nsudo dnf install ffmpeg  (Fedora)',
        darwin: 'brew install ffmpeg',
        win32: 'choco install ffmpeg  (Chocolatey)\nwinget install ffmpeg  (WinGet)\nOu télécharger sur https://ffmpeg.org/download.html',
    };
    return instructions[platform] || 'Voir https://ffmpeg.org/download.html';
}

/**
 * Helper to run ffmpeg commands safely
 */
export function runFFmpeg(args: string[], options: { timeout?: number } = {}): void {
    const result = spawnSync('ffmpeg', args, {
        stdio: 'ignore',
        timeout: options.timeout || 120000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`FFmpeg failed with code ${result.status}`);
}

/**
 * Helper to run ffprobe commands safely and return stdout
 */
export function runFFprobe(args: string[], options: { timeout?: number } = {}): string {
    const result = spawnSync('ffprobe', args, {
        encoding: 'utf-8',
        timeout: options.timeout || 15000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`FFprobe failed: ${result.stderr}`);
    return result.stdout;
}
