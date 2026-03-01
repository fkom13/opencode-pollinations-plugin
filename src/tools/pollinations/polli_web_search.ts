/**
 * polli_web_search Tool - Unified Web Search via Pollinations AI
 * 
 * Replaces: deepsearch.ts + search_crawl_scrape.ts
 * 
 * Three modes mapped to API models:
 * - rapid: Fast web search (perplexity-fast or Google Search model)
 * - medium: Standard web search with sources (perplexity-fast)
 * - deep: Deep research with reasoning (perplexity-reasoning)
 * 
 * Models are resolved dynamically from /text/models registry.
 * Integrated with Cost Guard and Toast notifications.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
    formatCost,
    extractCostFromHeaders,
    getTextModels,
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';
import { t } from '../../locales/index.js';

// ─── Cost Estimation ────────────────────────────────────────────────────

function estimateSearchCost(model: string): number {
    // Les requêtes de test montrent qu'un web-search coûte environ 0.005
    return 0.005;
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliWebSearchTool: ToolDefinition = tool({
    description: t('tools.polli_web_search.desc'),

    args: {
        query: tool.schema.string().describe(t('tools.polli_web_search.arg_query')),
        model: tool.schema.string().describe(t('tools.polli_web_search.arg_model')),
        include_sources: tool.schema.boolean().optional()
            .describe(t('tools.polli_web_search.arg_include_sources')),
        recency: tool.schema.enum(['any', 'day', 'week', 'month']).optional()
            .describe(t('tools.polli_web_search.arg_recency')),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_web_search.req_key');
        }

        const model = args.model;
        const includeSources = args.include_sources !== false;

        // Verify model
        const textModels = getTextModels();
        const isBetaModel = !textModels[model];

        if (isBetaModel) {
            emitStatusToast('warning', t('tools.polli_web_search.warn_beta', { model }), '🌐 web_search');
        }

        // Cost Guard
        const estimatedCost = estimateSearchCost(model);
        const costCheck = checkCostControl('polli_web_search', args, model, estimatedCost, 'audio'); // text models use audio category for tokens
        if (!costCheck.allowed) {
            return costCheck.message || t('tools.polli_web_search.blocked');
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', `🌐 Web Research [${model}]: ${args.query.substring(0, 40)}...${argsStr}`, '🌐 polli_web_search');

        // Metadata
        context.metadata({ title: `🔎 Res: ${args.query.substring(0, 50)}...` });

        try {
            // Build recency hint
            const recencyHints: Record<string, string> = {
                any: t('tools.polli_web_search.recency_any'),
                day: t('tools.polli_web_search.recency_day'),
                week: t('tools.polli_web_search.recency_week'),
                month: t('tools.polli_web_search.recency_month'),
            };

            const systemPrompt = `You are a specialized deep web research assistant.
${recencyHints[args.recency || 'any']}
${includeSources ? t('tools.polli_web_search.include_sources_prompt') : ''}`;

            const { data: responseData, headers: responseHeaders } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: args.query },
                    ],
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(responseData.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No results found';

            // Extract actual cost from headers
            let actualCost = estimatedCost;
            if (responseHeaders) {
                const costTracking = extractCostFromHeaders(responseHeaders);
                if (costTracking.costUsd !== undefined) {
                    actualCost = costTracking.costUsd;
                }
            }

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costCheck.message && !costCheck.allowed) {
                lines.push(costCheck.message);
                lines.push('');
            }

            lines.push(`🔎 Web Research Analytics`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(t('tools.polli_web_search.result_query', { query: args.query }));
            lines.push(t('tools.polli_web_search.result_model', { model: model }));
            if (args.recency && args.recency !== 'any') {
                lines.push(t('tools.polli_web_search.result_recency', { recency: args.recency }));
            }
            if (isTokenBased('audio', model)) {
                const maxCost = estimatedCost * 3;
                lines.push(t('tools.polli_web_search.result_cost_max', { cost: formatCost(actualCost), maxCost: formatCost(maxCost) }));
            } else {
                lines.push(t('tools.polli_web_search.result_cost', { cost: formatCost(actualCost) }));
            }
            lines.push('');
            lines.push(content);

            // Emit success toast
            emitStatusToast('success', t('tools.polli_web_search.toast_success', { model }), '🌐 polli_web_search');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', t('tools.polli_web_search.toast_error', { error: err.message?.substring(0, 60) }), '🌐 polli_web_search');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return t('tools.polli_web_search.insufficient_pollen');
            }
            return t('tools.polli_web_search.error_prefix', { error: err.message });
        }
    },
});
