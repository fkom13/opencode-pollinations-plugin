import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';

// ─── Shared Logic (Duplicated from rmbg to avoid circular deps if not using shared.ts for this) ──

const KEYS_FILE = path.join(
    process.env.HOME || process.env.USERPROFILE || '/tmp',
    '.pollinations', 'backgroundcut_keys.json'
);

interface KeyStore {
    keys: string[];
    currentIndex: number;
}

function loadKeys(): KeyStore {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
        }
    } catch { }
    return { keys: [], currentIndex: 0 };
}

function saveKeys(store: KeyStore) {
    try {
        const dir = path.dirname(KEYS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2));
    } catch { }
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const rmbgKeysTool: ToolDefinition = tool({
    description: `Manage BackgroundCut API keys for the remove_background tool.
Allows adding, listing, removing, and clearing keys.
Keys are stored locally in ~/.pollinations/backgroundcut_keys.json`,

    args: {
        action: tool.schema.string().describe('Action to perform: "list", "add", "remove", "clear"'), // Removed .enum()
        key: tool.schema.string().optional().describe('API Key to add or remove (required for add/remove)'),
    },

    async execute(args, context) {
        const action = args.action.toLowerCase();
        let store = loadKeys();

        switch (action) {
            case 'list':
                if (store.keys.length === 0) {
                    return `🔑 No keys stored. Using free provider (cut).`;
                }
                const maskedKeys = store.keys.map((k, i) => {
                    const active = i === store.currentIndex ? ' (active)' : '';
                    return `   ${i + 1}. ${k.substring(0, 8)}...${k.substring(k.length - 4)}${active}`;
                });
                return `🔑 BackgroundCut Keys: ${store.keys.length} stored\n${maskedKeys.join('\n')}`;

            case 'add':
                if (!args.key) return `❌ Error: Missing 'key' argument for add action.`;
                if (store.keys.includes(args.key)) return `⚠️ Key already exists.`;

                store.keys.push(args.key);
                saveKeys(store);

                context.metadata({
                    title: '🔑 Key Added',
                    metadata: { type: 'success', message: 'BackgroundCut key stored successfully' }
                });
                return `✅ Key added! Total keys: ${store.keys.length}.`;

            case 'remove':
                if (!args.key) return `❌ Error: Missing 'key' argument for remove action.`;
                const initialLen = store.keys.length;
                store.keys = store.keys.filter(k => k !== args.key);
                if (store.keys.length === initialLen) return `⚠️ Key not found.`;

                // Reset index if out of bounds
                if (store.currentIndex >= store.keys.length) store.currentIndex = 0;
                saveKeys(store);
                return `🗑️ Key removed. Remaining: ${store.keys.length}`;

            case 'clear':
                store = { keys: [], currentIndex: 0 };
                saveKeys(store);
                return `🗑️ All keys cleared. Reverting to free provider.`;

            default:
                return `❌ Unknown action: ${action}. Use list, add, remove, clear.`;
        }
    }
});
