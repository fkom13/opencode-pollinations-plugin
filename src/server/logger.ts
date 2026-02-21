import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Centraliser tous les logs dans un seul dossier temporaire
const LOG_DIR = path.join(os.tmpdir(), 'pollinations-plugin');
const LOG_FILE = path.join(LOG_DIR, 'plugin.log');
const API_LOG_FILE = path.join(LOG_DIR, 'api-debug.log');
const TOAST_LOG_FILE = path.join(LOG_DIR, 'toasts.log');

// Initialisation unique
function ensureLogDir() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    } catch { /* Silent fail — logging should never crash the app */ }
}
ensureLogDir();

export function log(msg: string, file = LOG_FILE): void {
    try {
        ensureLogDir(); // Ensure dir exists (in case it was deleted)
        fs.appendFileSync(file, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { }
}

export function logApi(msg: string): void {
    log(msg, API_LOG_FILE);
}

export function logToast(msg: string): void {
    log(msg, TOAST_LOG_FILE);
}

export const LOG_FILES = {
    main: LOG_FILE,
    api: API_LOG_FILE,
    toast: TOAST_LOG_FILE,
};
