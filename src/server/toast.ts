import * as fs from 'fs';
import { loadConfig } from './config.js';

// === QUEUE GLOBALE & CLIENT ===

interface ToastMessage {
    id: string;
    channel: 'status' | 'log';
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    displayed: boolean;
}

const toastQueue: ToastMessage[] = [];
let globalClient: any = null;

// === CONFIGURATION ===
// On charge la config au moment de l'émission pour décider

// === FONCTIONS PUBLIQUES ===

export function setGlobalClient(client: any) {
    globalClient = client;
}

// 1. CANAL LOGS (Technique)
export function emitLogToast(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title?: string
) {
    const config = loadConfig();
    const verbosity = config.gui.logs;

    if (verbosity === 'none') return;
    if (verbosity === 'error' && type !== 'error' && type !== 'warning') return;
    // 'verbose' shows all

    dispatchToast('log', type, message, title || 'Pollinations Log');
}

// 2. CANAL STATUS (Dashboard)
export function emitStatusToast(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title?: string
) {
    const config = loadConfig();
    const verbosity = config.gui.status;

    if (verbosity === 'none') return;
    // 'alert' logic handled by caller (proxy.ts) usually, but we can filter here too? 
    // Actually, 'all' sends everything. 'alert' sends only warnings/errors.
    if (verbosity === 'alert' && type !== 'error' && type !== 'warning') return;

    dispatchToast('status', type, message, title || 'Pollinations Status');
}

// INTERNAL DISPATCHER
function dispatchToast(
    channel: 'status' | 'log',
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title: string
) {
    const toast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel,
        type,
        title,
        message,
        timestamp: Date.now(),
        displayed: false
    };

    toastQueue.push(toast);
    logToastToFile(toast);

    if (globalClient) {
        globalClient.tui.showToast({
            body: {
                title: toast.title,
                message: toast.message,
                variant: toast.type,
                duration: channel === 'status' ? 6000 : 4000 // Status stays longer
            }
        }).then(() => {
            toast.displayed = true;
        }).catch(() => { });
    }

    while (toastQueue.length > 20) {
        toastQueue.shift();
    }
}

// === HELPERS ===

function logToastToFile(toast: ToastMessage) {
    try {
        const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.channel.toUpperCase()}] [${toast.type.toUpperCase()}] ${toast.message}`;
        fs.appendFileSync('/tmp/pollinations-toasts.log', logLine + '\n');
    } catch (e) { }
}


export function createToastHooks(client: any) {
    return {
        'session.idle': async ({ event }: any) => {
            // Deprecated: We use immediate dispatch now. 
            // Kept for backward compat if needed or legacy queued items.
        }
    };
}
