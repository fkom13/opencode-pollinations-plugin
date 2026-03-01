import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { handleUsageCommand, handleInfosCommand, handlePricingCommand, handleModelsCommand } from '../../server/commands.js';
import { t } from '../../locales/index.js';

export const polliStatusTool: ToolDefinition = tool({
    description: t('tools.polli_status.desc'),
    args: {
        info_type: tool.schema.enum(['usage', 'pricing', 'models', 'infos', 'all'])
            .describe(t('tools.polli_status.arg_info_type'))
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
            const res = await handleModelsCommand([]);
            results.push(res.response || String(res.error));
        }

        if (type === 'infos' || type === 'all') {
            const res = await handleInfosCommand();
            results.push(res.response || String(res.error));
        }

        return results.join('\n\n======================================================\n\n');
    }
});
