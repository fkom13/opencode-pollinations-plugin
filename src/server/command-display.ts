import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * OpenCode V2 command output: synthetic.description is what the TUI displays.
 * Long output must be paginated, never silently truncated.
 */
export function redactCommandOutput(value: string): string {
  return value
    .replace(/\bsk_[A-Za-z0-9._-]+/g, 'sk_[REDACTED]')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1[REDACTED]');
}

export function toReadableCommandText(value: string): string {
  return redactCommandOutput(value)
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\x60([^\x60]+)\x60/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*\|[-:|\s]+\|\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLongLine(line: string, limit: number): string[] {
  if (line.length <= limit) return [line];
  const pieces: string[] = [];
  let rest = line;
  while (rest.length > limit) {
    const space = rest.lastIndexOf(' ', limit);
    const cut = space > limit / 3 ? space : limit;
    pieces.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/** Split long command responses into readable complete TUI events. */
export function paginateCommandOutput(value: string, maxLength = 700): string[] {
  const safe = toReadableCommandText(value);
  if (!safe) return ['🌸 Pollinations'];
  const pages: string[] = [];
  let page = '';
  const limit = Math.max(100, maxLength);
  for (const original of safe.split('\n')) {
    for (const line of splitLongLine(original, limit)) {
      const next = page ? page + '\n' + line : line;
      if (page && next.length > limit) {
        pages.push(page);
        page = line;
      } else {
        page = next;
      }
    }
  }
  if (page) pages.push(page);
  return pages;
}

export function persistCommandReport(value: string, command: string): string {
  const state = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  const dir = path.join(state, 'pollinations', 'command-reports');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Refusing symlinked report folder');
  fs.chmodSync(dir, 0o700);
  const slug = command.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'command';
  const name = slug + '-' + Date.now() + '-' + randomUUID().slice(0, 8) + '.md';
  const dst = path.join(dir, name);
  fs.writeFileSync(dst, redactCommandOutput(value), { flag: 'wx', mode: 0o600 });
  return dst;
}
