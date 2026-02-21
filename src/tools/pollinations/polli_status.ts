import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { handleUsageCommand, handleInfosCommand, handlePricingCommand, handleModelsCommand } from '../../server/commands.js';

export const polliStatusTool: ToolDefinition = tool({
    description: `Check the current status, available models, live pricing, and account usage/tiers for the Pollinations AI plugin.`,
    args: {
        info_type: tool.schema.enum(['usage', 'pricing', 'models', 'infos', 'all'])
            .describe('Type of information to retrieve: usage=quota/wallet, pricing=model costs, models=list of models, infos=tier details, all=everything')
    },
    async execute(args, context) {
        let results: string[] = [];
        const type = args.info_type || 'all';

        if (type === 'usage' || type === 'all') {
            const res = await handleUsageCommand(['full']);
            results.push(res.response || String(res.error));
        }

        if (type === 'pricing' || type === 'all') {
            const res = await handlePricingCommand();
            results.push(res.response || String(res.error));
        }

        if (type === 'models' || type === 'all') {
            const res = handleModelsCommand([]);
            results.push(res.response || String(res.error));
        }

        if (type === 'infos' || type === 'all') {
            const res = await handleInfosCommand();
            results.push(res.response || String(res.error));
        }

        return results.join('\n\n======================================================\n\n');
    }
});
