
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
    version: string | number; // Dynamic from package.json
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

// LOAD PACKAGE VERSION
let PKG_VERSION = '5.0.0';
try {
    const pkgPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        PKG_VERSION = pkg.version;
    }
} catch (e) { }

const DEFAULT_CONFIG_V5: PollinationsConfigV5 = {
    version: PKG_VERSION,
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

// CACHE & WATCHER
let cachedConfig: PollinationsConfigV5 | null = null;
const listeners: Array<() => void> = [];

export function subscribeToConfigChange(callback: () => void) {
    listeners.push(callback);
}

function notifyListeners() {
    listeners.forEach(cb => {
        try { cb(); } catch (e) { logConfig(`Listener Error: ${e}`); }
    });
}

// Watchers (Debounced)
const watchedFiles = new Set<string>();

function watchFileSafe(filePath: string) {
    if (watchedFiles.has(filePath)) return;
    try {
        if (!fs.existsSync(filePath)) return;
        fs.watchFile(filePath, { interval: 2000 }, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                logConfig(`File Changed: ${path.basename(filePath)}. Reloading Config...`);
                cachedConfig = readConfigFromDisk();
                notifyListeners();
            }
        });
        watchedFiles.add(filePath);
    } catch (e) { logConfig(`Watch Error for ${filePath}: ${e}`); }
}

export function loadConfig(): PollinationsConfigV5 {
    // 1. Return Cache if available
    if (cachedConfig) return cachedConfig;

    // 2. Or Read Fresh
    cachedConfig = readConfigFromDisk();

    // 3. Initiate Watchers (Lazy)
    watchFileSafe(CONFIG_FILE);
    watchFileSafe(AUTH_FILE);
    watchFileSafe(OPENCODE_CONFIG_FILE);

    return cachedConfig;
}

// INTERNAL READER (The old loadConfig logic)
function readConfigFromDisk(): PollinationsConfigV5 {
    let config: any = { ...DEFAULT_CONFIG_V5 };
    let keyFound = false;

    // 1. Try Custom Config
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);

            // ... (Migration Logic is handled on Save, we trust Disk content here mostly)
            if (!custom.version || custom.version < 5) {
                // If old, we don't migrate inside read to avoid write-loops.
                // We just read what we can.
                if (custom.apiKey) config.apiKey = custom.apiKey;
                if (custom.mode) config.mode = custom.mode;
            } else {
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
                // Supports flat key or nested object
                const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];

                if (entry) {
                    const key = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (key && typeof key === 'string' && key.length > 10) {
                        config.apiKey = key;
                        config.mode = 'pro';
                        keyFound = true;
                        logConfig(`Hot-Loaded API Key from Auth Store`);
                    }
                }
            }
        } catch (e) { logConfig(`Error reading auth.json: ${e}`); }
    }

    // 3. Try OpenCode Config (Fallback)
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

    // Default mode correction
    if (!keyFound && config.mode === 'pro') {
        config.mode = 'manual';
    }

    return { ...config, version: PKG_VERSION } as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        // We must base updates on current state (even if cached is slightly old, we refresh first?)
        const current = readConfigFromDisk(); // Read disk for safety before write
        const updated = { ...current, ...updates, version: PKG_VERSION };

        if (!fs.existsSync(CONFIG_DIR_POLLI)) {
            fs.mkdirSync(CONFIG_DIR_POLLI, { recursive: true });
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        cachedConfig = updated; // Update Cache immediately
        return updated;
    } catch (e) {
        logConfig(`Error saving config: ${e}`);
        throw e;
    }
}
