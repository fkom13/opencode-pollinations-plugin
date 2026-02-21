import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { getPendingRequest, removePendingRequest } from './cost-guard.js';

// Import tools to re-execute them
import { polliGenImageTool } from './gen_image.js';
import { polliGenVideoTool } from './gen_video.js';
import { polliGenAudioTool } from './gen_audio.js';
import { polliGenMusicTool } from './gen_music.js';
import { polliWebSearchTool } from './polli_web_search.js';
import { formatCost } from './shared.js';

export const polliGenConfirmTool: ToolDefinition = tool({
    description: `Valide et exécute (ou annule) une requête Pollinations précédemment suspendue par le Cost Guard.
Cet outil doit être appelé lorsque l'utilisateur a explicitement donné son accord (ou refusé) pour dépenser le montant estimé.`,

    args: {
        request_id: tool.schema.string().describe('L\'identifiant de la requête (req_xxxx) retourné par l\'outil bloqué.'),
        action: tool.schema.enum(['confirm', 'cancel']).describe('L\'action à effectuer : confirm pour lancer la génération, cancel pour l\'annuler définitivement.'),
    },

    async execute(args, context) {
        const reqId = args.request_id;
        const action = args.action;
        const pendingReq = getPendingRequest(reqId);

        if (!pendingReq) {
            return `❌ Session introuvable ou expirée pour l'ID: ${reqId}. Veuillez relancer la génération initiale.`;
        }

        if (action === 'cancel') {
            removePendingRequest(reqId);
            return `✅ La requête ${reqId} a été annulée et supprimée de la file d'attente. Action abandonnée.`;
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
            return `❌ Outil cible inconnu: ${pendingReq.toolName}`;
        }

        // Add a bypass flag to arguments
        const executionArgs = { ...pendingReq.args };
        const CONFIRM_SYMBOL = Symbol.for('polli_confirmed');
        (executionArgs as any)[CONFIRM_SYMBOL] = true;

        context.metadata({ title: `✅ Confirmed: ${pendingReq.toolName} (${formatCost(pendingReq.estimatedCost)})` });

        // Execute original tool and clean up
        removePendingRequest(reqId);
        return await targetTool.execute(executionArgs, context);
    }
});
