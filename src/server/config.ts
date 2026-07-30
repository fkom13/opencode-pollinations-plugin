
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// PATHS
// PATHS & CROSS-PLATFORM LOGIC
export function getConfigDir(): string {
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || os.homedir(), 'pollinations');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'pollinations');
        default:
            return path.join(
                process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
                'pollinations'
            );
    }
}

export const CONFIG_DIR = getConfigDir();
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Legacy/External Paths (OpenCode specific)
const HOMEDIR = os.homedir();

// Multi-OS Candidate Paths for Auth & Global Config
function getExternalConfigPaths() {
    const candidatesAuth: string[] = [];
    const candidatesConfig: string[] = [];

    // 0. OpenCode Environment Variables (Highest Priority)
    if (process.env.OPENCODE_CONFIG) {
        // Direct config file path
        candidatesConfig.push(process.env.OPENCODE_CONFIG);
    }
    if (process.env.OPENCODE_CONFIG_DIR) {
        // Config directory override
        candidatesConfig.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'opencode.json'));
        candidatesConfig.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'config.json'));
        candidatesAuth.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'auth.json'));
    }
    // Also check standard env vars often used in overrides
    if (process.env.OPENCODE_AUTH) candidatesAuth.push(process.env.OPENCODE_AUTH);


    // 1. Linux Standard (Current)
    // ... rest of function ...
    candidatesAuth.push(path.join(HOMEDIR, '.local', 'share', 'opencode', 'auth.json'));
    candidatesConfig.push(path.join(HOMEDIR, '.config', 'opencode', 'opencode.json'));

    // 2. Windows Standard (%APPDATA%)
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(HOMEDIR, 'AppData', 'Roaming');
        candidatesAuth.push(path.join(appData, 'opencode', 'auth.json'));
        candidatesAuth.push(path.join(appData, 'OpenCode', 'auth.json'));
        candidatesConfig.push(path.join(appData, 'opencode', 'config.json'));
    }

    // 3. Mac Standard
    if (process.platform === 'darwin') {
        const support = path.join(HOMEDIR, 'Library', 'Application Support', 'OpenCode');
        candidatesAuth.push(path.join(support, 'auth.json'));
        candidatesConfig.push(path.join(support, 'config.json'));
    }

    return { auth: candidatesAuth, config: candidatesConfig };
}

const EXTERNAL_PATHS = getExternalConfigPaths();

// === V5 CONFIGURATION SCHEMA ===

export interface PollinationsConfigV5 {
    version: string | number;
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;
    keyHasAccessToProfile?: boolean;

    gui: {
        status: 'none' | 'alert' | 'all';
        logs: 'none' | 'error' | 'verbose';
    };

    thresholds: {
        tier: number;
        wallet: number;
    };

    fallbacks: {
        free: { main: string; agent: string; };
        enter: { agent: string; };
    };

    enablePaidTools: boolean;
    costThreshold: number; // Default 0.15 🌻
    costConfirmationRequired: boolean; // Ask confirmation when cost exceeds threshold (default: true)
    statusBar: boolean;
    costEstimator: boolean; // Show cost estimates in tool outputs (default: true)
    refillOverride?: number; // Manual Quest Pollen refill override (0.01/0.15/0.4/0.8/10)
    questStashInFreeMode?: boolean; // Count quest stash as free in alwaysfree Safety Net (default: true)
    lang?: string; // Interface language (en, fr, etc.)
}

// LOAD PACKAGE VERSION
let PKG_VERSION = '5.2.0';
try {
    const pkgPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        PKG_VERSION = pkg.version;
    }
} catch (e) { logSystem(`[Config] Error loading package version: ${e}`); }

const DEFAULT_CONFIG_V5: PollinationsConfigV5 = {
    version: PKG_VERSION,
    mode: 'manual',
    gui: { status: 'alert', logs: 'none' },
    thresholds: { tier: 10, wallet: 5 },
    fallbacks: {
        free: { main: 'free/openai-fast', agent: 'free/openai-fast' },
        enter: { agent: 'free/openai-fast' }
    },
    enablePaidTools: false,
    costThreshold: 0.15, // Default 0.15 🌻
    costConfirmationRequired: true, // Ask confirmation when cost exceeds threshold
    keyHasAccessToProfile: true, // Default true for legacy keys
    statusBar: true,
    costEstimator: true, // Show cost estimates by default
    questStashInFreeMode: true, // Count quest stash as free in alwaysfree
    lang: 'en', // Default language is English
};

import { log as logSystem } from './logger.js';

function logConfig(msg: string) {
    logSystem(`[Config] ${msg}`);
}

// SIMPLE LOAD (Direct Disk Read - No Caching, No Watchers)
// This ensures the Proxy ALWAYS sees the latest state from auth.json
export function loadConfig(): PollinationsConfigV5 {
    return readConfigFromDisk();
}

function readConfigFromDisk(): PollinationsConfigV5 {
    let config: any = { ...DEFAULT_CONFIG_V5 };
    let finalKey: string | undefined = undefined;
    let source: string = 'none';

    // TIMESTAMP BASED PRIORITY LOGIC
    // We want the most recently updated Valid Key to win.

    let configTime = 0;
    let authTime = 0;

    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { logSystem(`[Config] Error stat config: ${e}`); }
    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { logSystem(`[Config] Error stat config: ${e}`); }
    try {
        for (const f of EXTERNAL_PATHS.auth) {
            if (fs.existsSync(f)) {
                authTime = Math.max(authTime, fs.statSync(f).mtime.getTime());
            }
        }
    } catch (e) { logSystem(`[Config] Error stat auth candidates: ${e}`); }

    // 1. EXTRACT KEYS
    // 1. EXTRACT KEYS
    let configKey: string | undefined = undefined;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom }; // Helper: We load the rest of config anyway
            if (custom.apiKey && custom.apiKey.length > 5) configKey = custom.apiKey;
        } catch (e) {
            logConfig(`ERROR reading config.json: ${e}`);
            // Backup corrupt file to avoid overwrite loop
            try { fs.copyFileSync(CONFIG_FILE, CONFIG_FILE + '.corrupt'); } catch (e) { logSystem(`[Config] Error copying corrupt config: ${e}`); }
        }
    }

    let authKey: string | undefined = undefined;

    // Check all auth candidates
    for (const authFile of EXTERNAL_PATHS.auth) {
        if (fs.existsSync(authFile)) {
            try {
                authTime = Math.max(authTime, fs.statSync(authFile).mtime.getTime()); // Track newest
                const raw = fs.readFileSync(authFile, 'utf-8');
                const authData = JSON.parse(raw);
                const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];
                if (entry) {
                    const k = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (k && typeof k === 'string' && k.length > 10) {
                        authKey = k;
                        break; // Found a key, stop looking (priority to first found? or newest? First in list is Linux default so ok)
                    }
                }
            } catch (e) {
                logConfig(`ERROR reading auth candidate ${authFile}: ${e}`);
            }
        }
    }

    // 2. DETERMINE WINNER
    // If both exist, newest wins. If one exists, it wins.
    if (configKey && authKey) {
        if (configTime >= authTime) {
            finalKey = configKey;
            source = 'config.json';
        } else {
            finalKey = authKey;
            source = 'auth.json';
        }
    } else if (configKey) {
        finalKey = configKey;
        source = 'config.json';
    } else if (authKey) {
        finalKey = authKey;
        source = 'auth.json';
    }

    // 3. Fallback to OpenCode Global Config (Lowest Priority)
    if (!finalKey) {
        try {
            for (const configFile of EXTERNAL_PATHS.config) {
                if (fs.existsSync(configFile)) {
                    const raw = fs.readFileSync(configFile, 'utf-8');
                    const data = JSON.parse(raw);
                    const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                        data?.provider?.pollinations_enter?.options?.apiKey;
                    if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                        finalKey = nativeKey;
                        source = 'opencode_global';
                        break;
                    }
                }
            }
        } catch (e) { logSystem(`[Config] Error reading global override config: ${e}`); }
    }

    // 4. APPLY
    if (finalKey) {
        config.apiKey = finalKey;
        // config.mode = 'pro'; // REMOVED: Mode is decoupled from Key presence.
    } else {
        // Ensure no phantom key remains
        delete config.apiKey;
        // if (config.mode === 'pro') config.mode = 'manual'; // OPTIONAL: Downgrade if no key? User says "No link".
        // Actually, if I am in PRO mode and lose my key, I am broken. Falling back to manual is safer?
        // User said "Manual mode is like standard API".
        // Let's REMOVE this auto-downgrade too to be strictly "Decoupled".
        // If user is in PRO without key, they get "Missing Key" error, which is correct.
    }

    return { ...config, version: PKG_VERSION } as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        const current = readConfigFromDisk();
        const updated = { ...current, ...updates, version: PKG_VERSION };

        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        logConfig(`Error saving config: ${e}`);
        throw e;
    }
}

// === NATIVE AUTH SYNC ===
export function saveKeyToAuthJson(key: string): boolean {
    let success = false;
    for (const authFile of EXTERNAL_PATHS.auth) {
        try {
            let authData: any = {};
            if (fs.existsSync(authFile)) {
                authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
            } else {
                // Ensure directory exists if we create a new auth.json
                fs.mkdirSync(path.dirname(authFile), { recursive: true });
            }

            // Set the key (OpenCode standard struct)
            authData['pollinations'] = {
                type: "api",
                key: key
            };

            fs.writeFileSync(authFile, JSON.stringify(authData, null, 2), 'utf-8');
            logConfig(`Synchronized API key to native auth file: ${authFile}`);
            success = true;
            // Only write to the first valid one we find/create, or write to all existing?
            // Usually writing to all existing ones is safest to avoid desync
        } catch (e) {
            logConfig(`Failed to sync to auth file ${authFile}: ${e}`);
        }
    }
    return success;
}

// === MIGRATION UTIL ===
export function migrateLegacyConfig() {
    try {
        const legacyDir = path.join(os.homedir(), '.pollinations');
        const newDir = getConfigDir();

        if (fs.existsSync(legacyDir) && legacyDir !== newDir) {
            logConfig(`Migrating legacy config from ${legacyDir} to ${newDir}`);
            if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

            const files = fs.readdirSync(legacyDir);
            for (const file of files) {
                const srcPath = path.join(legacyDir, file);
                const destPath = path.join(newDir, file);

                // Don't overwrite existing new files (priority to new system)
                if (!fs.existsSync(destPath)) {
                    // Check if it's a file
                    if (fs.statSync(srcPath).isFile()) {
                        fs.copyFileSync(srcPath, destPath); // Copy first
                        // fs.unlinkSync(srcPath); // Optional: Delete old? Let's keep for safety for now.
                        logConfig(`Migrated: ${file}`);
                    }
                }
            }
        }
    } catch (e) {
        logConfig(`Migration Error: ${e}`);
    }
}
