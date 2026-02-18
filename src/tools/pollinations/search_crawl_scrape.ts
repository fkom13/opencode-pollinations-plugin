/**
 * search_crawl_scrape Tool - Web Search and Content Extraction
 * 
 * Uses perplexity-fast for quick web search with sources
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
} from './shared.js';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const searchCrawlScrapeTool: ToolDefinition = tool({
    description: `Search the web and extract information quickly.

**Model:** perplexity-fast

**Features:**
- Real-time web search
- Source citations
- Quick summaries
- Current information

**Use for:**
- Quick fact lookups
- Current news/events
- Documentation search
- General web queries

**Cost:** ~0.000001 🌻 per token (very cheap)`,

    args: {
        query: tool.schema.string().describe('Search query'),
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

        const model = 'perplexity-fast';
        const includeSources = args.include_sources !== false;

        // Build recency hint
        const recencyHints: Record<string, string> = {
            any: '',
            day: 'Focus on information from the last 24 hours. ',
            week: 'Focus on information from the last week. ',
            month: 'Focus on information from the last month. ',
        };

        // Metadata
        context.metadata({ title: `🔎 Search: ${args.query.substring(0, 40)}...` });

        try {
            const systemPrompt = `You are a web search assistant. Provide concise, accurate answers based on web search results.
${recencyHints[args.recency || 'any']}
${includeSources ? 'Always include source URLs at the end of your response.' : ''}`;

            const { data } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: 2000,
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(data.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No results found';

            // Format result
            const lines = [
                `🔎 Web Search Results`,
                `━━━━━━━━━━━━━━━━━━`,
                `Query: ${args.query}`,
                `Model: ${model}`,
                ``,
                content,
            ];

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            return `❌ Erreur Web Search: ${err.message}`;
        }
    },
});
