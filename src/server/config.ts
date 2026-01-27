
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// PATHS
const HOMEDIR = os.homedir();
const CONFIG_DIR_POLLI = path.join(HOMEDIR, '.pollinations');
const CONFIG_FILE = path.join(CONFIG_DIR_POLLI, 'config.json');
const CONFIG_DIR_OPENCODE = path.join(HOMEDIR, '.config', 'opencode');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR_OPENCODE, 'opencode.json');
const AUTH_FILE = path.join(HOMEDIR, '.local', 'share', 'opencode', 'auth.json');

// === V5 CONFIGURATION SCHEMA ===

export interface PollinationsConfigV5 {
    version: number; // 5
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;

    // GUI (Double Channel Notification)
    gui: {
        status: 'none' | 'alert' | 'all'; // Quota/State
        logs: 'none' | 'error' | 'verbose'; // Technical/Errors
    };

    // Safety Net Thresholds
    thresholds: {
        tier: number;   // % Free Tier remaining (for Alert)
        wallet: number; // % Wallet remaining (for Auto-Switch Safety Net)
    };

    // Precise Fallbacks
    fallbacks: {
        free: {
            main: string; // Target when forced to Free
            agent: string; // Target agent when forced to Free
        };
        enter: {
            agent: string; // Target agent in Pro mode (can be free or enter)
        };
    };

    // Misc
    enablePaidTools: boolean;
    statusBar: boolean;
}

const DEFAULT_CONFIG_V5: PollinationsConfigV5 = {
    version: 5,
    mode: 'manual',
    gui: {
        status: 'alert',
        logs: 'none'
    },
    thresholds: {
        tier: 10,  // Alert if < 10%
        wallet: 5  // Switch if < 5% (Wallet Protection)
    },
    fallbacks: {
        free: {
            main: 'free/mistral', // Fallback gratuit solide
            agent: 'free/openai-fast' // Agent gratuit rapide
        },
        enter: {
            agent: 'free/gemini' // Agent de secours (Free Gemini)
        }
    },
    enablePaidTools: false,
    statusBar: true
};

// Debug Helper
function logConfig(msg: string) {
    try {
        if (!fs.existsSync('/tmp/opencode_pollinations_config_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_config_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_config_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export function loadConfig(): PollinationsConfigV5 {
    let config: any = { ...DEFAULT_CONFIG_V5 };
    let keyFound = false;

    // 1. Try Custom Config
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);

            // === MIGRATION LOGIC V4 -> V5 ===
            if (!custom.version || custom.version < 5) {
                logConfig(`Migrating Config V${custom.version || 0} -> V5`);

                // Migrate GUI
                if (custom.toastVerbosity) {
                    if (custom.toastVerbosity === 'none') { config.gui.status = 'none'; config.gui.logs = 'none'; }
                    if (custom.toastVerbosity === 'alert') { config.gui.status = 'alert'; config.gui.logs = 'error'; }
                    if (custom.toastVerbosity === 'all') { config.gui.status = 'all'; config.gui.logs = 'verbose'; }
                }

                // Migrate Fallbacks
                if (custom.fallbackModels) {
                    if (custom.fallbackModels.main) config.fallbacks.free.main = custom.fallbackModels.main;
                    if (custom.fallbackModels.agent) {
                        config.fallbacks.free.agent = custom.fallbackModels.agent;
                        config.fallbacks.enter.agent = custom.fallbackModels.agent;
                    }
                }

                // Preserve others
                if (custom.apiKey) config.apiKey = custom.apiKey;
                if (custom.mode) config.mode = custom.mode;
                if (custom.statusBar !== undefined) config.statusBar = custom.statusBar;

                // Save Migrated
                saveConfig(config);
            } else {
                // Already V5
                config = { ...config, ...custom };
            }

            if (config.apiKey) keyFound = true;
        }
    } catch (e) { logConfig(`Error loading config: ${e}`); }

    // 2. Try Native Auth Storage (Recovery)
    if (!keyFound) {
        try {
            if (fs.existsSync(AUTH_FILE)) {
                const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
                const authData = JSON.parse(raw);
                const entry = authData['pollinations'] || authData['pollinations_enter'];

                if (entry) {
                    const key = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (key && typeof key === 'string' && key.length > 10) {
                        config.apiKey = key;
                        config.mode = 'pro';
                        keyFound = true;
                        logConfig(`Recovered API Key from Auth Store`);
                    }
                }
            }
        } catch (e) { logConfig(`Error reading auth.json: ${e}`); }
    }

    // 3. Try OpenCode Config
    if (!keyFound) {
        try {
            if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
                const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
                const data = JSON.parse(raw);
                const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                    data?.provider?.pollinations_enter?.options?.apiKey;

                if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                    config.apiKey = nativeKey;
                    config.mode = 'pro';
                    keyFound = true;
                }
            }
        } catch (e) { }
    }

    // Default mode logic
    if (!keyFound && config.mode === 'pro') {
        config.mode = 'manual';
    }

    return config as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        const current = loadConfig();
        const updated = { ...current, ...updates, version: 5 };

        if (!fs.existsSync(CONFIG_DIR_POLLI)) {
            fs.mkdirSync(CONFIG_DIR_POLLI, { recursive: true });
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        logConfig(`Error saving config: ${e}`);
        throw e;
    }
}
