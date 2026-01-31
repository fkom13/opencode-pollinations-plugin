
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
    statusBar: boolean;
}

// LOAD PACKAGE VERSION
let PKG_VERSION = '5.2.0';
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
    gui: { status: 'alert', logs: 'none' },
    thresholds: { tier: 10, wallet: 5 },
    fallbacks: {
        free: { main: 'free/mistral', agent: 'free/openai-fast' },
        enter: { agent: 'free/openai-fast' }
    },
    enablePaidTools: false,
    keyHasAccessToProfile: true, // Default true for legacy keys
    statusBar: true
};

function logConfig(msg: string) {
    try {
        if (!fs.existsSync('/tmp/opencode_pollinations_config_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_config_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_config_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
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

    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { }
    try { if (fs.existsSync(AUTH_FILE)) authTime = fs.statSync(AUTH_FILE).mtime.getTime(); } catch (e) { }

    // 1. EXTRACT KEYS
    let configKey: string | undefined = undefined;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom }; // Helper: We load the rest of config anyway
            if (custom.apiKey && custom.apiKey.length > 5) configKey = custom.apiKey;
        } catch (e) { }
    }

    let authKey: string | undefined = undefined;
    if (fs.existsSync(AUTH_FILE)) {
        try {
            const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
            const authData = JSON.parse(raw);
            const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];
            if (entry) {
                const k = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                if (k && typeof k === 'string' && k.length > 10) authKey = k;
            }
        } catch (e) { }
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
            if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
                const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
                const data = JSON.parse(raw);
                const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                    data?.provider?.pollinations_enter?.options?.apiKey;
                if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                    finalKey = nativeKey;
                    source = 'opencode.json';
                }
            }
        } catch (e) { }
    }

    // 4. APPLY
    if (finalKey) {
        config.apiKey = finalKey;
        config.mode = 'pro';
        // logConfig(`Loaded Key from ${source}`); // Debug
    } else {
        // Ensure no phantom key remains
        delete config.apiKey;
        if (config.mode === 'pro') config.mode = 'manual';
    }

    return { ...config, version: PKG_VERSION } as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        const current = readConfigFromDisk();
        const updated = { ...current, ...updates, version: PKG_VERSION };

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
