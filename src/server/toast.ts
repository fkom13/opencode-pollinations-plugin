import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
    title?: string,
    metadata?: { filePath?: string; params?: Record<string, any> }
) {
    const config = loadConfig();
    const verbosity = config.gui.status;

    if (verbosity === 'none') return;
    if (verbosity === 'alert' && type !== 'error' && type !== 'warning') return;

    let finalMessage = message;

    if (metadata?.filePath) {
        finalMessage += `\n📁 ${metadata.filePath}`;
    }

    if (type === 'success' || type === 'error') {
        // En arrière-plan, essaye de récupérer le quota localement sans bloquer l'appel
        import('./quota.js').then(({ getQuotaStatus, formatQuotaForToast }) => {
            getQuotaStatus(false).then(quota => {
                const quotaMsg = formatQuotaForToast
                    ? formatQuotaForToast(quota)
                    : `🌻 Freetier: ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} | Wallet: $${quota.walletBalance.toFixed(2)}`;
                finalMessage += `\n${quotaMsg}`;
                dispatchToast('status', type, finalMessage, title || 'Pollinations Status');
            }).catch(() => {
                dispatchToast('status', type, finalMessage, title || 'Pollinations Status');
            });
        }).catch(() => {
            dispatchToast('status', type, finalMessage, title || 'Pollinations Status');
        });
    } else {
        dispatchToast('status', type, finalMessage, title || 'Pollinations Status');
    }
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

import { logToast } from './logger.js';

function logToastToFile(toast: ToastMessage) {
    const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.channel.toUpperCase()}] [${toast.type.toUpperCase()}] ${toast.message}`;
    logToast(logLine);
}

export function createToastHooks(client: any) {
    return {
        'session.idle': async ({ event }: any) => {
            // Deprecated: We use immediate dispatch now. 
            // Kept for backward compat if needed or legacy queued items.
        }
    };
}

// 3. CANAL TOOLS (Natif)
export function createToolHooks(client: any) {
    return {
        'tool.execute.after': async (input: any, output: any) => {
            // Check for metadata in the output
            if (output.metadata && output.metadata.message) {
                const meta = output.metadata;
                const type = meta.type || 'info';
                // If title is not in metadata, try to use the one from output or default
                const title = meta.title || output.title || 'Pollinations Tool';

                // Emit the toast
                emitStatusToast(type, meta.message, title);
            }
        }
    };
}
