
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.env.HOME || '/tmp', '.config/opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'pollinations-config.json');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR, 'opencode.json');
const AUTH_FILE = path.join(process.env.HOME || '/tmp', '.local/share/opencode/auth.json');
const AUTH_FILE_ALT = path.join(CONFIG_DIR, 'auth.json'); // Also check ~/.config/opencode/auth.json

export interface PollinationsConfig {
    apiKey?: string;
    mode: 'manual' | 'alwaysfree' | 'pro';
    fallback_models: string[];
    thresholds: { tier: number, wallet: number };
    toast_verbosity: 'alert' | 'always';
    enable_paid_tools: boolean;
    customModels?: any[];
}

const DEFAULT_CONFIG: PollinationsConfig = {
    mode: 'manual',
    fallback_models: ['mistral', 'openai-fast'],
    thresholds: { tier: 10, wallet: 5 },
    toast_verbosity: 'alert',
    enable_paid_tools: false,
    customModels: []
};

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Debug Helper
function logConfig(msg: string) {
    try {
        const fs = require('fs');
        fs.appendFileSync('/tmp/pollinations-config-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export function loadConfig(): PollinationsConfig {
    // 1. Try Native Auth Storage (auth.json) - Where /connect saves keys
    // Check both locations
    const authFiles = [AUTH_FILE, AUTH_FILE_ALT];
    let foundKey: string | undefined;

    for (const f of authFiles) {
        try {
            if (fs.existsSync(f)) {
                const raw = fs.readFileSync(f, 'utf-8');
                const authData = JSON.parse(raw);
                const entry = authData['pollinations'] || authData['pollinations_enter'];
                const key = (typeof entry === 'object' && entry?.key) ? entry.key : entry;

                if (key && typeof key === 'string' && key.length > 5) {
                    logConfig(`Found Key in ${f}`);
                    foundKey = key;
                    break;
                }
            }
        } catch (e) {
            logConfig(`Error reading ${f}: ${e}`);
        }
    }

    if (foundKey) {
        // Load custom config first to get user preferences, then override auth
        let base = { ...DEFAULT_CONFIG };
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
                base = { ...base, ...JSON.parse(raw) };
            }
        } catch (e) { }

        return { ...base, apiKey: foundKey };
    }

    // 2. Try Native OpenCode Config first (Standard Path)
    try {
        if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
            const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
            const data = JSON.parse(raw);
            const nativeKey = data?.provider?.pollinations_enter?.options?.apiKey;

            if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                logConfig(`Found Native Key in opencode.json: ...${nativeKey.slice(-4)}`);
                return {
                    ...DEFAULT_CONFIG,
                    mode: 'pro',
                    apiKey: nativeKey,
                    customModels: []
                };
            }
        }
    } catch (e) {
        logConfig(`Error reading opencode.json: ${e}`);
    }

    // 3. Fallback to Custom Config (Legacy/Manual)
    logConfig(`HOME=${process.env.HOME}, CONFIG_FILE=${CONFIG_FILE}`);
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            logConfig(`Loaded custom config...`);
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        } else {
            logConfig(`Custom config file not found at ${CONFIG_FILE}`);
        }
    } catch (e) {
        console.error("Failed to load config:", e);
        logConfig(`Error loading custom config: ${e}`);
    }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<PollinationsConfig>) {
    try {
        const current = loadConfig();
        const updated = { ...current, ...config };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        console.error("Failed to save config:", e);
        throw e;
    }
}
