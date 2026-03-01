import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { resolveOutputDir, formatFileSize, safeName, formatTimestamp, TOOL_DIRS } from '../shared.js';
import { hasSystemFFmpeg, getFFmpegInstallInstructions, runFFmpeg, runFFprobe } from '../ffmpeg.js';

// ─── Download helper ────────────────────────────────────────────────────────

function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ext = path.extname(new URL(url).pathname) || '.mp4';
        const tempPath = path.join(os.tmpdir(), `video_${Date.now()}${ext}`);
        const proto = url.startsWith('https') ? https : http;

        const req = (proto as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location).then(resolve).catch(reject);
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
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout (120s)')); });
    });
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const extractAudioTool: ToolDefinition = tool({
    description: `Extract the audio track from a video file or URL.
Outputs MP3, WAV, AAC, or FLAC format.
Can optionally extract only a time range (start/end).
Requires system ffmpeg installed.
Free to use — no API key needed.`,

    args: {
        source: tool.schema.string().describe('Video file path (absolute) or URL'),
        format: tool.schema.enum(['mp3', 'wav', 'aac', 'flac']).optional()
            .describe('Output audio format (default: mp3)'),
        start: tool.schema.string().optional()
            .describe('Start time to extract from (e.g. "00:00:10" or "10")'),
        end: tool.schema.string().optional()
            .describe('End time to extract to (e.g. "00:01:30" or "90")'),
        filename: tool.schema.string().optional()
            .describe('Custom output filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional()
            .describe('Custom output directory. Default: ~/Downloads/pollinations/audio/'),
    },

    async execute(args, context) {
        if (!hasSystemFFmpeg()) {
            return [
                `❌ FFmpeg non trouvé!`,
                ``,
                `Cet outil nécessite ffmpeg :`,
                getFFmpegInstallInstructions().split('\n').map(l => `  • ${l}`).join('\n')
            ].join('\n');
        }

        // Resolve source
        let videoPath: string;
        let isRemote = false;

        if (args.source.startsWith('http://') || args.source.startsWith('https://')) {
            isRemote = true;
            context.metadata({ title: `🎵 Téléchargement vidéo...` });
            try {
                videoPath = await downloadFile(args.source);
            } catch (err: any) {
                return `❌ Erreur téléchargement: ${err.message}`;
            }
        } else {
            videoPath = args.source;
            if (!fs.existsSync(videoPath)) {
                return `❌ Fichier introuvable: ${videoPath}`;
            }
        }

        // Check if video has audio
        try {
            // Using runFFprobe helper
            const probe = runFFprobe([
                '-v', 'quiet',
                '-select_streams', 'a',
                '-show_entries', 'stream=codec_type',
                '-of', 'csv=p=0',
                videoPath
            ], { timeout: 10000 }).trim();

            if (!probe) {
                if (isRemote) try { fs.unlinkSync(videoPath); } catch { }
                return `❌ Aucune piste audio détectée dans cette vidéo.`;
            }
        } catch { }

        const outputFormat = args.format || 'mp3';
        const outputDir = resolveOutputDir(TOOL_DIRS.audio, args.output_path);
        const baseName = args.filename
            ? safeName(args.filename)
            : safeName(path.basename(videoPath, path.extname(videoPath)));
        const outputFile = path.join(outputDir, `${baseName}.${outputFormat}`);

        try {
            context.metadata({ title: `🎵 Extraction audio...` });

            // Build ffmpeg args
            const ffmpegArgs = ['-y', '-i', videoPath, '-vn'];

            // Time range
            if (args.start) ffmpegArgs.push('-ss', args.start);
            if (args.end) ffmpegArgs.push('-to', args.end);

            // Format-specific encoding
            switch (outputFormat) {
                case 'mp3': ffmpegArgs.push('-acodec', 'libmp3lame', '-q:a', '2'); break;
                case 'wav': ffmpegArgs.push('-acodec', 'pcm_s16le'); break;
                case 'aac': ffmpegArgs.push('-acodec', 'aac', '-b:a', '192k'); break;
                case 'flac': ffmpegArgs.push('-acodec', 'flac'); break;
            }

            ffmpegArgs.push(outputFile);

            runFFmpeg(ffmpegArgs, { timeout: 120000 });

            // Cleanup
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }

            if (!fs.existsSync(outputFile)) {
                return `❌ Extraction échouée — aucun fichier audio produit.`;
            }

            const stats = fs.statSync(outputFile);

            // Get audio duration
            let durationStr = 'N/A';
            try {
                const durRaw = runFFprobe([
                    '-v', 'quiet',
                    '-show_entries', 'format=duration',
                    '-of', 'csv=p=0',
                    outputFile
                ], { timeout: 5000 }).trim();

                const dur = parseFloat(durRaw);
                if (!isNaN(dur)) durationStr = formatTimestamp(dur);
            } catch { }

            return [
                `🎵 Audio Extrait`,
                `━━━━━━━━━━━━━━━━━`,
                `Source: ${isRemote ? args.source : path.basename(videoPath)}`,
                `Format: ${outputFormat.toUpperCase()}`,
                `Durée: ${durationStr}`,
                `Fichier: ${outputFile}`,
                `Taille: ${formatFileSize(stats.size)}`,
                args.start || args.end ? `Plage: ${args.start || '0:00'} → ${args.end || 'fin'}` : '',
                ``,
                `Coût: Gratuit (ffmpeg local)`,
            ].filter(Boolean).join('\n');

        } catch (err: any) {
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            return `❌ Erreur extraction audio: ${err.message}`;
        }
    },
});
