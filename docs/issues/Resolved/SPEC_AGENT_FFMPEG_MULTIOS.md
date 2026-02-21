# SPEC — FFmpeg Cross-Platform

> Cible : Agents de refactoring / PR review
> Scope : `tools/power/extract_audio.ts`, `tools/power/extract_frames.ts`

---

## Problème

Les outils `extract_audio` et `extract_frames` construisent des commandes ffmpeg sous forme de **chaînes de texte** passées à `execSync`. Cela pose deux problèmes cross-platform :

1. **Quoting des chemins** : sur `cmd.exe` Windows, les guillemets doubles dans les strings de commandes se comportent différemment.
2. **Shell invoqué** : `execSync('cmd string')` utilise `/bin/sh` sur Linux/macOS, `cmd.exe` sur Windows — comportements incompatibles pour les pipes, les `||`, etc.

---

## Inventaire des Occurrences

### `extract_frames.ts`

```typescript
// ❌ PROBLÉMATIQUE
const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
const raw = execSync(probeCmd, { timeout: 15000, encoding: 'utf-8' });

let cmd = `ffmpeg -y -i "${videoPath}"`;
cmd += ` -ss ${options.at_time} -frames:v 1 "${singleOutput}"`;
execSync(cmd, { stdio: 'ignore', timeout: 60000 });
```

### `extract_audio.ts`

```typescript
// ❌ PROBLÉMATIQUE
let cmd = `ffmpeg -y -i "${videoPath}" -vn`;
cmd += ` "${outputFile}"`;
execSync(cmd, { stdio: 'ignore', timeout: 120000 });

const durRaw = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputFile}"`,
    { timeout: 5000, encoding: 'utf-8' }
).trim();
```

---

## Solution : `spawnSync` avec Tableau d'Arguments

`spawnSync` avec un tableau d'arguments contourne **totalement** le shell — pas d'interprétation de quotes, de pipes, ou de caractères spéciaux. C'est la méthode recommandée pour les commandes avec des chemins arbitraires.

### Pattern de remplacement — ffprobe JSON

```typescript
import { spawnSync } from 'child_process';

function probeVideo(videoPath: string): any {
    const result = spawnSync('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath  // Pas besoin de quotes — c'est un argument, pas du shell
    ], {
        timeout: 15000,
        encoding: 'utf-8',
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
    return JSON.parse(result.stdout);
}
```

### Pattern de remplacement — ffmpeg extraction de frame

```typescript
function extractSingleFrame(videoPath: string, timestamp: string, outputPath: string): void {
    const result = spawnSync('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-ss', timestamp,
        '-frames:v', '1',
        outputPath,
    ], {
        stdio: 'ignore',
        timeout: 60000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`ffmpeg failed with code ${result.status}`);
}
```

### Pattern de remplacement — ffmpeg extraction de frames range

```typescript
function extractFrameRange(
    videoPath: string,
    outputPattern: string,
    options: { start?: string; end?: string; fps: number }
): void {
    const args = ['-y', '-i', videoPath];

    if (options.start) args.push('-ss', options.start);
    if (options.end) args.push('-to', options.end);

    args.push('-vf', `fps=${options.fps}`, outputPattern);

    const result = spawnSync('ffmpeg', args, {
        stdio: 'ignore',
        timeout: 120000,
    });

    if (result.error) throw result.error;
}
```

### Pattern de remplacement — ffmpeg extraction audio

```typescript
function extractAudio(
    videoPath: string,
    outputFile: string,
    format: string,
    options: { start?: string; end?: string }
): void {
    const args = ['-y', '-i', videoPath, '-vn'];

    if (options.start) args.push('-ss', options.start);
    if (options.end) args.push('-to', options.end);

    // Codec selon format
    if (format === 'mp3') args.push('-acodec', 'libmp3lame', '-ab', '192k');
    else if (format === 'aac') args.push('-acodec', 'aac', '-b:a', '192k');
    else if (format === 'flac') args.push('-acodec', 'flac');

    args.push(outputFile);

    const result = spawnSync('ffmpeg', args, {
        stdio: 'ignore',
        timeout: 120000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Audio extraction failed (code ${result.status})`);
}
```

---

## Détection de FFmpeg

La détection actuelle utilise `execSync('ffmpeg -version', { stdio: 'ignore' })`. Préférer :

```typescript
import { spawnSync } from 'child_process';

export function hasFFmpeg(): boolean {
    const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}

export function hasFFprobe(): boolean {
    const result = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}
```

---

## Message d'Installation Cross-Platform

```typescript
function getFFmpegInstallInstructions(): string {
    const platform = process.platform;
    const instructions: Record<string, string> = {
        linux:  'sudo apt install ffmpeg  (Debian/Ubuntu)\nsudo dnf install ffmpeg  (Fedora)',
        darwin: 'brew install ffmpeg',
        win32:  'choco install ffmpeg  (Chocolatey)\nwinget install ffmpeg  (WinGet)\nOu télécharger sur https://ffmpeg.org/download.html',
    };
    return instructions[platform] || 'Voir https://ffmpeg.org/download.html';
}
```

---

## Tests de Validation

- [ ] `extract_frames` fonctionne sur un chemin avec espaces (`/home/user/my videos/test.mp4`)
- [ ] `extract_audio` fonctionne sur Windows (`C:\Users\User\My Videos\test.mp4`)
- [ ] Les messages d'erreur incluent des instructions d'installation adaptées à la plateforme
- [ ] `spawnSync` ne bloque pas l'event loop sur des vidéos longues (considérer `spawn` async pour vidéos > 100MB)
