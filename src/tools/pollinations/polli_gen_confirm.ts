import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { getPendingRequest, removePendingRequest } from './cost-guard.js';
import { t } from '../../locales/index.js';

// Import tools to re-execute them
import { polliGenImageTool } from './gen_image.js';
import { polliGenVideoTool } from './gen_video.js';
import { polliGenAudioTool } from './gen_audio.js';
import { polliGenMusicTool } from './gen_music.js';
import { polliWebSearchTool } from './polli_web_search.js';
import { formatCost } from './shared.js';

export const polliGenConfirmTool: ToolDefinition = tool({
    description: t('tools.polli_gen_confirm.desc'),

    args: {
        request_id: tool.schema.string().describe(t('tools.polli_gen_confirm.arg_request_id')),
        action: tool.schema.enum(['confirm', 'cancel']).describe(t('tools.polli_gen_confirm.arg_action')),
    },

    async execute(args, context) {
        const reqId = args.request_id;
        const action = args.action;
        const pendingReq = getPendingRequest(reqId);

        if (!pendingReq) {
            return t('tools.polli_gen_confirm.not_found', { reqId });
        }

        if (action === 'cancel') {
            removePendingRequest(reqId);
            return t('tools.polli_gen_confirm.cancelled', { reqId });
        }

        const toolRegistry: Record<string, any> = {
            'polli_gen_image': polliGenImageTool,
            'polli_gen_video': polliGenVideoTool,
            'polli_gen_audio': polliGenAudioTool,
            'polli_gen_music': polliGenMusicTool,
            'polli_web_search': polliWebSearchTool,
        };

        const targetTool = toolRegistry[pendingReq.toolName];
        if (!targetTool) {
            return t('tools.polli_gen_confirm.unknown_tool', { toolName: pendingReq.toolName });
        }

        // Add a bypass flag to arguments
        const executionArgs = { ...pendingReq.args };
        const CONFIRM_SYMBOL = Symbol.for('polli_confirmed');
        (executionArgs as any)[CONFIRM_SYMBOL] = true;

        context.metadata({ title: t('tools.polli_gen_confirm.toast_confirmed', { toolName: pendingReq.toolName, cost: formatCost(pendingReq.estimatedCost) }) });

        // Execute original tool and clean up
        removePendingRequest(reqId);
        return await targetTool.execute(executionArgs, context);
    }
});
