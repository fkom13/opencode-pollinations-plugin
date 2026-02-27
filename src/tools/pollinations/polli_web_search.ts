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
} from './shared.js';
import { loadConfig } from '../../server/config.js';
import { checkCostControl, isTokenBased } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Mode Configuration ────────────────────────────────────────────────────

interface SearchMode {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    label: string;
    emoji: string;
}

const SEARCH_MODES: Record<string, SearchMode> = {
    rapid: {
        model: 'perplexity-fast',
        maxTokens: 1500,
        systemPrompt: 'You are a quick web search assistant. Provide concise, accurate answers with key sources. Be efficient and direct.',
        label: 'Recherche Rapide',
        emoji: '⚡',
    },
    medium: {
        model: 'perplexity-fast',
        maxTokens: 3000,
        systemPrompt: 'You are a web search assistant. Provide comprehensive research with analysis, sources, and reasoning steps. Always include source URLs.',
        label: 'Recherche Standard',
        emoji: '🔎',
    },
    deep: {
        model: 'perplexity-reasoning',
        maxTokens: 8000,
        systemPrompt: 'You are a deep research assistant. Provide exhaustive research with multiple perspectives, detailed analysis, all relevant sources, and thorough fact-checking. Consider edge cases and alternative viewpoints. Always include source URLs.',
        label: 'Recherche Profonde',
        emoji: '🔬',
    },
};

// ─── Cost Estimation ────────────────────────────────────────────────────

function estimateSearchCost(mode: string): number {
    switch (mode) {
        case 'rapid': return 0.001;
        case 'medium': return 0.003;
        case 'deep': return 0.008;
        default: return 0.003;
    }
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliWebSearchTool: ToolDefinition = tool({
    description: `Search the web using Pollinations AI with three depth levels.

**Modes:**

| Mode | Modèle | Usage | Coût estimé |
|------|--------|-------|-------------|
| ⚡ rapid | perplexity-fast | Quick facts, current events | ~0.001 🌻 |
| 🔎 medium | perplexity-fast | Standard research with sources | ~0.003 🌻 |
| 🔬 deep | perplexity-reasoning | In-depth analysis, multi-perspective | ~0.008 🌻 |

**💡 Tips:**
- Use \`rapid\` for quick lookups and current news
- Use \`medium\` for documentation search and general queries
- Use \`deep\` for complex research, fact-checking, and analysis
- Add \`recency\` filter for time-sensitive queries`,

    args: {
        query: tool.schema.string().describe('Search query or research question'),
        mode: tool.schema.enum(['rapid', 'medium', 'deep']).optional()
            .describe('Search depth (default: medium)'),
        include_sources: tool.schema.boolean().optional()
            .describe('Include source URLs in response (default: true)'),
        recency: tool.schema.enum(['any', 'day', 'week', 'month']).optional()
            .describe('Filter by recency (default: any)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Web Search nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const mode = args.mode || 'medium';
        const modeConfig = SEARCH_MODES[mode];
        const includeSources = args.include_sources !== false;

        // Cost Guard
        const estimatedCost = estimateSearchCost(mode);
        const costCheck = checkCostControl('polli_web_search', args, modeConfig.model, estimatedCost, 'audio'); // text models use audio category
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }

        // Emit start toast
        const config = loadConfig();
        const argsStr = config.gui?.logs === 'verbose' ? `\nParameters: ${JSON.stringify(args)}` : '';
        emitStatusToast('info', `${modeConfig.emoji} ${modeConfig.label}: ${args.query.substring(0, 40)}...${argsStr}`, '🌐 polli_web_search');

        // Metadata
        context.metadata({ title: `${modeConfig.emoji} Search: ${args.query.substring(0, 50)}...` });

        try {
            // Build recency hint
            const recencyHints: Record<string, string> = {
                any: '',
                day: 'Focus on information from the last 24 hours. ',
                week: 'Focus on information from the last week. ',
                month: 'Focus on information from the last month. ',
            };

            const systemPrompt = `${modeConfig.systemPrompt}
${recencyHints[args.recency || 'any']}
${includeSources ? 'Always include source URLs at the end of your response.' : ''}`;

            const { data: responseData, headers: responseHeaders } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: modeConfig.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: modeConfig.maxTokens,
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

            lines.push(`${modeConfig.emoji} ${modeConfig.label}`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Query: ${args.query}`);
            lines.push(`Mode: ${mode} | Modèle: ${modeConfig.model}`);
            if (args.recency && args.recency !== 'any') {
                lines.push(`Récence: ${args.recency}`);
            }
            if (isTokenBased('audio', modeConfig.model)) {
                const maxCost = estimatedCost * 3;
                lines.push(`Coût estimé: ${formatCost(actualCost)} (Max théorique: ${formatCost(maxCost)})`);
            } else {
                lines.push(`Coût estimé: ${formatCost(actualCost)}`);
            }
            lines.push('');
            lines.push(content);

            // Emit success toast
            emitStatusToast('success', `Recherche terminée ✓ (${mode})`, '🌐 polli_web_search');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🌐 polli_web_search');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.`;
            }
            return `❌ Erreur Web Search: ${err.message}`;
        }
    },
});
