import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { loadConfig, saveConfig } from '../../server/config.js';
import { emitStatusToast } from '../../server/toast.js';

export const polliConfigTool: ToolDefinition = tool({
    description: `[CRITICAL TOOL FOR ASSISTANT] View or modify the Pollinations plugin configuration.
You must strictly understand the 3 INDEPENDENT categories of settings before explaining or changing them:

=== 1. CHAT MODELS & FALLBACKS (Applies ONLY to conversational chat models) ===
- mode: Dictates fallback rules for the chat.
   * 'manual': No automatic rules.
   * 'alwaysfree': Free tiers first. If 'thresholdsTier' is reached -> fallbacks to Free Universe. NEVER uses Wallet.
   * 'pro': Uses Wallet. If 'thresholdsWallet' is reached -> fallbacks to Free Universe.
- thresholdsTier: WARNING PERCENTAGE (e.g. 10 for 10%) that triggers chat fallback in 'alwaysfree' mode.
- thresholdsWallet: WARNING PERCENTAGE (e.g. 50 for 50%) that triggers chat fallback in 'pro' mode.
*Note: 'enter.agent' or 'free.agent' are fallback conversational models for logic reasoning, THEY DO NOT GENERATE IMAGES OR VIDEOS!*

=== 2. TOOLS PROTECTION (Applies ONLY to independent 'polli_' tools like image, video, search) ===
- enablePaidTools: Allow tools to execute models that consume 'Wallet' pollen. If false, tools can only use models that consume 'Freetier' pollen.
- costConfirmationRequired: Safety lock for tools. If true, the user MUST manually confirm BEFORE executing ANY tool whose cost estimate exceeds the 'costThreshold'.
- costThreshold: USD/🌼 limit (cost of the tool execution) that triggers the confirmation lock.
- costEstimator: Shows live cost estimates IN TOOL OUTPUTS (false = Silent Mode).

=== 3. UI & NOTIFICATIONS (General display) ===
- statusBar: Show/Hide the floating status bar notification in the OpenCode UI.

Use 'action=update' to change these. NEVER confuse Chat Mode with Tools Protection!`,
    args: {
        action: tool.schema.enum(['view', 'update'])
            .describe('Action to perform: "view" to see current configuration, "update" to modify it.'),
        mode: tool.schema.enum(['manual', 'alwaysfree', 'pro']).optional().describe('CHAT ONLY: Dictates automatic fallback rules (manual/alwaysfree/pro).'),
        costEstimator: tool.schema.boolean().optional().describe('Set to true to show cost estimates auto. Set to false for "Manual Mode" (hide estimates).'),
        statusBar: tool.schema.boolean().optional().describe('Enable/disable status bar visibility (true/false)'),
        costConfirmationRequired: tool.schema.boolean().optional().describe('Safety Lock: Set to true to ask user confirmation before spending money. Set to false to spend automatically.'),
        enablePaidTools: tool.schema.boolean().optional().describe('Allow execution of paid or premium models using user Wallet balance (true/false)'),
        costThreshold: tool.schema.number().optional().describe('Cost threshold in USD/🌼 above which confirmation is required'),
        thresholdsTier: tool.schema.number().optional().describe('Warning threshold PERCENTAGE (e.g. 10 for 10%) for Free Tier.'),
        thresholdsWallet: tool.schema.number().optional().describe('Warning threshold PERCENTAGE (e.g. 50 for 50%) for Wallet balance.')
    },
    async execute(args, context) {
        if (args.action === 'view') {
            const current = loadConfig();
            // Obfuscate API key for safety in logs/UI
            const safeConfig = { ...current };
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
            if (args.costThreshold !== undefined) updates.costThreshold = args.costThreshold;

            if (args.thresholdsTier !== undefined || args.thresholdsWallet !== undefined) {
                updates.thresholds = { ...currentConfig.thresholds };
                if (args.thresholdsTier !== undefined) updates.thresholds.tier = args.thresholdsTier;
                if (args.thresholdsWallet !== undefined) updates.thresholds.wallet = args.thresholdsWallet;
            }

            if (Object.keys(updates).length === 0) {
                return "No configuration values provided to update. Please specify at least one setting via the arguments.";
            }

            saveConfig(updates);

            const newConfig = loadConfig();
            if (newConfig.statusBar) {
                const changedDetails = Object.keys(updates).map(k => {
                    const val = updates[k as keyof typeof updates];
                    return `${k}=${typeof val === 'object' ? JSON.stringify(val) : val}`;
                }).join(", ");
                let toastMsg = "⚙️ Configuration modifiée par l'Agent";
                if (changedDetails.length > 0) {
                    toastMsg += ` (${changedDetails})`;
                }
                emitStatusToast('info', toastMsg, 'Config Update');
            }

            return `Configuration successfully updated.\nApplied changes:\n${JSON.stringify(updates, null, 2)}\n\n(Note: Verify with polli_status if you need to know model prefixes).`;
        }

        return "Invalid action. Use 'view' or 'update'.";
    }
});
