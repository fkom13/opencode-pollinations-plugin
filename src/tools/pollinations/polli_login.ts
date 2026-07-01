import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { startDeviceLogin, awaitDeviceLogin } from '../../server/commands.js';
import { t } from '../../locales/index.js';

/**
 * polli_login — Device-flow login as a TOOL (callable by ANY OpenCode model).
 *
 * Two-step pattern so the agent can both SHOW the code and KNOW when connected:
 *   1. polli_login()            -> returns code + URL (show it to the user)
 *   2. polli_login(wait:true)   -> attaches to the running poller and RETURNS
 *                                  "✅ connected" once the user authorizes.
 *
 * Shares the exact same logic as the `/poll login` command. The login is
 * attributed to this app (embedded pk_) and never spends the developer's Pollen.
 */
export const polliLoginTool: ToolDefinition = tool({
    description: t('tools.polli_login.desc'),
    args: {
        wait: tool.schema.boolean().optional()
            .describe(t('tools.polli_login.arg_wait')),
    },
    async execute(args) {
        // Wait mode: attach to an in-progress login and report the final outcome.
        if (args.wait) {
            return await awaitDeviceLogin();
        }
        // Start mode: kick off the device flow and return the code + URL to show.
        const res = await startDeviceLogin();
        return res.response || res.error || 'Login could not be started.';
    },
});
