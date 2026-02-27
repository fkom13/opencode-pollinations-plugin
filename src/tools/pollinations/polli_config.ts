import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { loadConfig, saveConfig } from '../../server/config.js';
import { emitStatusToast } from '../../server/toast.js';

export const polliConfigTool: ToolDefinition = tool({
    description: `[CRITICAL TOOL FOR ASSISTANT] View or modify the Pollinations plugin configuration.
Use this tool ONLY when the user explicitly asks to view or change plugin settings (e.g. "change threshold", "disable cost estimates", "enable paid tools", "pass in manual mode").
CRITICAL: Do not confuse 'Mode' with features. The conceptual "Mode Manuel" usually means disabling 'costEstimator' and enabling 'costConfirmationRequired' so the user has full control. 
To discover model prefixes or precise names, use the 'polli_status' tool.

Available settings to modify via this tool:
1. mode: The general operating mode of the plugin ("manual", "alwaysfree" or "pro").
2. costEstimator: Show live cost estimates in tool outputs. (false = Silent Mode).
3. costConfirmationRequired: Safety lock. If true, crossing the threshold requires explicit user confirmation.
4. enablePaidTools: Let the AI use the paid 'Wallet' balance instead of free tier.
5. costThreshold: The USD/🌼 limit that triggers the confirmation lock lock (0.00 to 10.00).
6. statusBar: Show/Hide the bottom status bar in UI.
7. thresholdsTier: The WARNING PERCENTAGE (e.g. 10 for 10%) for the Free Tier quota.
8. thresholdsWallet: The WARNING PERCENTAGE (e.g. 50 for 50%) for the Wallet balance.`,
    args: {
        action: tool.schema.enum(['view', 'update'])
            .describe('Action to perform: "view" to see current configuration, "update" to modify it.'),
        mode: tool.schema.enum(['manual', 'alwaysfree', 'pro']).optional().describe('General Plugin Mode. PRO allows wallet deductions, MANUAL requires you to pass explicit flags (no auto-deduction). ALWAYSFREE forces free-tier.'),
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
                emitStatusToast('info', "⚙️ Configuration du plugin mise à jour par l'Agent", 'Config Update');
            }

            return `Configuration successfully updated.\nApplied changes:\n${JSON.stringify(updates, null, 2)}\n\n(Note: Verify with polli_status if you need to know model prefixes).`;
        }

        return "Invalid action. Use 'view' or 'update'.";
    }
});
