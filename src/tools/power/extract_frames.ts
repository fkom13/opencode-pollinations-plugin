import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { resolveOutputDir, formatFileSize, safeName, formatTimestamp, TOOL_DIRS } from '../shared.js';

// ─── Video metadata extraction via ffprobe ──────────────────────────────────

interface VideoMetadata {
    duration: number;       // seconds
    durationStr: string;    // formatted HH:MM:SS.ms
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: string;
    fileSize: string;
    hasAudio: boolean;
    audioCodec?: string;
    audioSampleRate?: string;
    audioChannels?: number;
    format: string;
}

function extractMetadata(videoPath: string): VideoMetadata | null {
    try {
        const { execSync } = require('child_process');

        // Use ffprobe JSON output for reliable parsing
        const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
        const raw = execSync(probeCmd, { timeout: 15000, encoding: 'utf-8' });
        const data = JSON.parse(raw);

        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
        const format = data.format || {};

        const duration = parseFloat(format.duration || videoStream?.duration || '0');
        const fpsStr = videoStream?.r_frame_rate || '0/1';
        const [fpsNum, fpsDen] = fpsStr.split('/').map(Number);
        const fps = fpsDen ? Math.round((fpsNum / fpsDen) * 100) / 100 : 0;

        const stats = fs.statSync(videoPath);

        return {
            duration,
            durationStr: formatTimestamp(duration),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps,
            codec: videoStream?.codec_name || 'unknown',
            bitrate: format.bit_rate ? `${Math.round(parseInt(format.bit_rate) / 1000)} kbps` : 'N/A',
            fileSize: formatFileSize(stats.size),
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name,
            audioSampleRate: audioStream?.sample_rate ? `${audioStream.sample_rate} Hz` : undefined,
            audioChannels: audioStream?.channels,
            format: format.format_name || path.extname(videoPath).slice(1),
        };
    } catch {
        return null;
    }
}

function formatMetadataReport(meta: VideoMetadata, source: string): string {
    const lines = [
        `📋 Métadonnées Vidéo`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `Source: ${source}`,
        `Durée: ${meta.durationStr} (${meta.duration.toFixed(2)}s)`,
        `Résolution: ${meta.width}×${meta.height}`,
        `FPS: ${meta.fps}`,
        `Codec: ${meta.codec}`,
        `Bitrate: ${meta.bitrate}`,
        `Taille: ${meta.fileSize}`,
        `Format: ${meta.format}`,
    ];

    if (meta.hasAudio) {
        lines.push(`Audio: ${meta.audioCodec || 'oui'} (${meta.audioSampleRate || 'N/A'}, ${meta.audioChannels || '?'}ch)`);
    } else {
        lines.push(`Audio: aucun`);
    }

    return lines.join('\n');
}

// ─── Video download ─────────────────────────────────────────────────────────

function downloadVideo(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
        const proto = url.startsWith('https') ? https : http;

        const req = (proto as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadVideo(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const ws = fs.createWriteStream(tempPath);
            res.pipe(ws);
            ws.on('finish', () => { ws.close(); resolve(tempPath); });
            ws.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout téléchargement (120s)')); });
    });
}

// ─── FFmpeg availability ────────────────────────────────────────────────────

function hasSystemFFmpeg(): boolean {
    try {
        const { execSync } = require('child_process');
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch { return false; }
}

// ─── Frame extraction ───────────────────────────────────────────────────────

function extractWithSystemFFmpeg(
    videoPath: string,
    outputDir: string,
    baseName: string,
    options: { at_time?: string; start?: string; end?: string; fps?: number }
): string[] {
    const { execSync } = require('child_process');
    const outputs: string[] = [];

    let cmd = `ffmpeg -y -i "${videoPath}"`;

    if (options.at_time) {
        const singleOutput = path.join(outputDir, `${baseName}_at_${options.at_time.replace(/:/g, '-')}.png`);
        cmd += ` -ss ${options.at_time} -frames:v 1 "${singleOutput}"`;
        execSync(cmd, { stdio: 'ignore', timeout: 60000 });
        if (fs.existsSync(singleOutput)) outputs.push(singleOutput);
    } else {
        if (options.start) cmd += ` -ss ${options.start}`;
        if (options.end) cmd += ` -to ${options.end}`;
        const fps = options.fps || 1;
        const outputPattern = path.join(outputDir, `${baseName}_%03d.png`);
        cmd += ` -vf "fps=${fps}" "${outputPattern}"`;
        execSync(cmd, { stdio: 'ignore', timeout: 120000 });

        fs.readdirSync(outputDir)
            .filter(f => f.startsWith(baseName) && f.endsWith('.png'))
            .sort()
            .forEach(f => outputs.push(path.join(outputDir, f)));
    }

    return outputs;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const extractFramesTool: ToolDefinition = tool({
    description: `Extract image frames from a video file or URL, and/or inspect video metadata.
Can extract a single frame at a specific timestamp, or multiple frames from a time range.
Set metadata_only=true to just get video info (duration, resolution, fps, codec, audio).
Requires system ffmpeg (sudo apt install ffmpeg).
Supports MP4, WebM, AVI, MKV, and other common formats.
Free to use — no API key needed.`,

    args: {
        source: tool.schema.string().describe('Video file path (absolute) or URL'),
        at_time: tool.schema.string().optional().describe('Extract single frame at timestamp (e.g. "00:00:05" or "5")'),
        start: tool.schema.string().optional().describe('Start time for range extraction (e.g. "00:00:02")'),
        end: tool.schema.string().optional().describe('End time for range extraction (e.g. "00:00:10")'),
        fps: tool.schema.number().min(0.1).max(30).optional().describe('Frames per second for range extraction (default: 1)'),
        filename: tool.schema.string().optional().describe('Base filename prefix. Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory (absolute or relative). Default: ~/Downloads/pollinations/frames/'),
        metadata_only: tool.schema.boolean().optional().describe('If true, only return video metadata without extracting frames'),
    },

    async execute(args, context) {
        // Check ffmpeg
        if (!hasSystemFFmpeg()) {
            return [
                `❌ FFmpeg non trouvé!`,
                ``,
                `Cet outil nécessite ffmpeg. Installez-le :`,
                `  • Linux: sudo apt install ffmpeg`,
                `  • macOS: brew install ffmpeg`,
                `  • Windows: choco install ffmpeg`,
            ].join('\n');
        }

        // Resolve source: URL → download, path → validate
        let videoPath: string;
        let isRemote = false;

        if (args.source.startsWith('http://') || args.source.startsWith('https://')) {
            isRemote = true;
            context.metadata({ title: `🎬 Téléchargement vidéo...` });
            try {
                videoPath = await downloadVideo(args.source);
            } catch (err: any) {
                return `❌ Erreur téléchargement: ${err.message}`;
            }
        } else {
            videoPath = args.source;
            if (!fs.existsSync(videoPath)) {
                return `❌ Fichier introuvable: ${videoPath}`;
            }
        }

        // ─── Metadata mode ─────────────────────────────────────────────
        if (args.metadata_only) {
            const meta = extractMetadata(videoPath);
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            if (!meta) return `❌ Impossible de lire les métadonnées. Vérifiez que ffprobe est installé.`;
            return formatMetadataReport(meta, isRemote ? args.source : path.basename(videoPath));
        }

        // ─── Frame extraction mode ──────────────────────────────────────
        const outputDir = resolveOutputDir(TOOL_DIRS.frames, args.output_path);
        const baseName = args.filename
            ? safeName(args.filename)
            : `frame_${Date.now()}`;

        try {
            context.metadata({ title: `🎬 Extraction frames...` });

            // Get metadata for context
            const meta = extractMetadata(videoPath);

            const extractedFiles = extractWithSystemFFmpeg(videoPath, outputDir, baseName, {
                at_time: args.at_time,
                start: args.start,
                end: args.end,
                fps: args.fps,
            });

            // Cleanup temp video
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }

            if (extractedFiles.length === 0) {
                return `❌ Aucune frame extraite. Vérifiez vos timestamps et la source vidéo.`;
            }

            const totalSize = extractedFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);

            const fileList = extractedFiles.length <= 5
                ? extractedFiles.map(f => `  📷 ${path.basename(f)}`).join('\n')
                : [
                    ...extractedFiles.slice(0, 3).map(f => `  📷 ${path.basename(f)}`),
                    `  ... et ${extractedFiles.length - 3} de plus`,
                ].join('\n');

            const lines = [
                `🎬 Frames Extraites`,
                `━━━━━━━━━━━━━━━━━━━`,
                `Source: ${isRemote ? args.source : path.basename(videoPath)}`,
            ];

            // Add video metadata if available
            if (meta) {
                lines.push(`Vidéo: ${meta.width}×${meta.height} • ${meta.fps} fps • ${meta.durationStr}`);
            }

            lines.push(
                `Frames: ${extractedFiles.length}`,
                `Dossier: ${outputDir}`,
                `Taille totale: ${formatFileSize(totalSize)}`,
                `Fichiers:`,
                fileList,
                ``,
                `Coût: Gratuit (ffmpeg local)`,
            );

            return lines.join('\n');

        } catch (err: any) {
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            return `❌ Erreur extraction: ${err.message}`;
        }
    },
});
