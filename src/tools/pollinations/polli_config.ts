import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { loadConfig, saveConfig } from '../../server/config.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

export const polliConfigTool: ToolDefinition = tool({
    description: `[CRITICAL TOOL FOR ASSISTANT] View or modify the Pollinations plugin configuration.
You must strictly understand the 3 INDEPENDENT categories of settings before explaining or changing them:

=== 1. CHAT MODELS & FALLBACKS (Applies ONLY to conversational chat models) ===
- mode: Dictates fallback rules for the chat.
   * 'manual': No automatic rules.
   * 'quest' (QUEST_PREFERRED): Quest pollen first. Server may fall back to Paid if Quest is insufficient. Falls back to the Free Universe when BOTH Quest and Paid look exhausted.
   * 'quest_only' (QUEST_ELIGIBLE_ONLY): Blocks paid_only models locally, only sends when the client considers the call Quest-eligible. BEST-EFFORT — a Paid (pack) debit can still occur server-side (race/real cost). No paid re-route.
   * 'paid' (PAID_ALLOWED): Paid allowed, paid_only allowed per Cost Guard. Falls back to Free Universe when the wallet drops below thresholdsWallet.
- thresholdsQuest: absolute Quest pollen floor (e.g. 0.05) that triggers chat fallback in 'quest_only' mode.
- thresholdsWallet: absolute Paid pollen floor (e.g. 0.5) that triggers chat fallback in 'paid' mode.
*Note: 'enter.agent' or 'free.agent' are fallback conversational models for logic reasoning, THEY DO NOT GENERATE IMAGES OR VIDEOS!*

=== 2. TOOLS PROTECTION (Applies ONLY to independent 'polli_' tools like image, video, search) ===
- enablePaidTools: When false, tools that would use 'Paid' pollen are BLOCKED LOCALLY — models flagged paid_only are rejected before sending. IMPORTANT: this is a LOCAL client-side guard, NOT a server guarantee — a Paid (pack) debit can still occur in a race or on real-cost overage (the server picks the billing bucket at debit time).
- costConfirmationRequired: Safety lock for tools. If true, the user MUST manually confirm BEFORE executing ANY tool whose cost estimate exceeds the 'costThreshold'.
- costThreshold: 🌼 limit (cost of the tool execution) that triggers the confirmation lock.
- costEstimator: Shows live cost estimates IN TOOL OUTPUTS (false = Silent Mode).

=== 3. UI & NOTIFICATIONS (General display) ===
- statusBar: Show/Hide the floating status bar notification in the OpenCode UI.

Use 'action=update' to change these. NEVER confuse Chat Mode with Tools Protection!`,
    args: {
        action: tool.schema.enum(['view', 'update'])
            .describe('Action to perform: "view" to see current configuration, "update" to modify it.'),
        mode: tool.schema.enum(['manual', 'quest', 'quest_only', 'paid']).optional().describe('CHAT ONLY: Dictates automatic fallback rules (manual/quest/quest_only/paid).'),
        costEstimator: tool.schema.boolean().optional().describe('Set to true to show cost estimates auto. Set to false for "Manual Mode" (hide estimates).'),
        statusBar: tool.schema.boolean().optional().describe('Enable/disable status bar visibility (true/false)'),
        costConfirmationRequired: tool.schema.boolean().optional().describe('Safety Lock: Set to true to ask user confirmation before spending money. Set to false to spend automatically.'),
        enablePaidTools: tool.schema.boolean().optional().describe('Allow execution of paid or premium models using Paid pollen (true/false)'),
        enableDeveloperTools: tool.schema.boolean().optional().describe('Expose developer-only API discovery/fuzzing tools after restart (default false).'),
        costThreshold: tool.schema.number().optional().describe('Cost threshold in 🌼 above which confirmation is required'),
        thresholdsQuest: tool.schema.number().optional().describe('Absolute Quest pollen floor (e.g. 0.05) for quest_only fallback.'),
        thresholdsWallet: tool.schema.number().optional().describe('Absolute Paid pollen floor (e.g. 0.5) for paid mode fallback.'),
        lang: tool.schema.enum(['en', 'fr', 'es', 'de', 'it', 'zh']).optional().describe('Plugin language for commands and toasts (en, fr, es, de, it, zh).'),
    },
    async execute(args, context) {
        if (args.action === 'view') {
            const current = loadConfig();
            // Obfuscate API key for safety in logs/UI
            const safeConfig: any = { ...current };
            if (safeConfig.apiKey && safeConfig.apiKey.length > 10) {
                safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...[REDACTED]';
            }
            return `Current Plugin Configuration:\n\n${JSON.stringify(safeConfig, null, 2)}`;
        }

        if (args.action === 'update') {
            const currentConfig = loadConfig();
            const updates: any = {};
            if (args.mode !== undefined) updates.mode = args.mode;
            if (args.costEstimator !== undefined) updates.costEstimator = args.costEstimator;
            if (args.statusBar !== undefined) updates.statusBar = args.statusBar;
            if (args.costConfirmationRequired !== undefined) updates.costConfirmationRequired = args.costConfirmationRequired;
            if (args.enablePaidTools !== undefined) updates.enablePaidTools = args.enablePaidTools;
            if (args.enableDeveloperTools !== undefined) updates.enableDeveloperTools = args.enableDeveloperTools;
            if (args.costThreshold !== undefined) updates.costThreshold = args.costThreshold;
            if (args.lang !== undefined) updates.lang = args.lang;

            if (args.thresholdsQuest !== undefined || args.thresholdsWallet !== undefined) {
                updates.thresholds = { ...currentConfig.thresholds };
                if (args.thresholdsQuest !== undefined) updates.thresholds.quest = args.thresholdsQuest;
                if (args.thresholdsWallet !== undefined) updates.thresholds.wallet = args.thresholdsWallet;
            }

            if (Object.keys(updates).length === 0) {
                return t('tools.config.no_values');
            }

            saveConfig(updates);

            const newConfig = loadConfig();
            if (newConfig.statusBar) {
                const changedDetails = Object.keys(updates).map(k => {
                    const val = updates[k as keyof typeof updates];
                    return `${k}=${typeof val === 'object' ? JSON.stringify(val) : val}`;
                }).join(", ");
                let toastMsg = t('toasts.config_updated');
                if (changedDetails.length > 0) {
                    toastMsg += ` (${changedDetails})`;
                }
                emitStatusToast('info', toastMsg, 'Config Update');
            }

            return t('tools.config.success', { updates: JSON.stringify(updates, null, 2) });
        }

        return "Invalid action. Use 'view' or 'update'.";
    }
});
