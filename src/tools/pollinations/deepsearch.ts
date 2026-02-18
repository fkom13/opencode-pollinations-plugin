/**
 * deepsearch Tool - Deep Research with AI
 * 
 * Uses perplexity-reasoning for in-depth research and analysis
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
} from './shared.js';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const deepsearchTool: ToolDefinition = tool({
    description: `Perform deep research and analysis on a topic using AI reasoning.

**Model:** perplexity-reasoning

This tool provides comprehensive research with:
- Multi-step reasoning
- Source citations
- In-depth analysis
- Fact verification

**Use for:**
- Complex research questions
- Technical analysis
- Fact-checking
- Comparative studies

**Cost:** ~0.000002-0.000008 🌻 per token (very affordable)`,

    args: {
        query: tool.schema.string().describe('Research query or question to investigate'),
        depth: tool.schema.enum(['quick', 'standard', 'thorough']).optional()
            .describe('Research depth (default: standard)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Deep Search nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = 'perplexity-reasoning';
        const depth = args.depth || 'standard';

        // Metadata
        context.metadata({ title: `🔍 Deep Search: ${args.query.substring(0, 50)}...` });

        try {
            // Build system prompt based on depth
            const systemPrompts: Record<string, string> = {
                quick: 'Provide a concise but thorough answer with key sources. Be efficient.',
                standard: 'Provide comprehensive research with analysis, sources, and reasoning steps.',
                thorough: 'Provide exhaustive research with multiple perspectives, detailed analysis, all relevant sources, and thorough fact-checking. Consider edge cases and alternative viewpoints.',
            };

            const { data } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompts[depth] },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: depth === 'thorough' ? 8000 : depth === 'standard' ? 4000 : 2000,
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(data.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No response';

            // Format result
            const lines = [
                `🔍 Deep Search Results`,
                `━━━━━━━━━━━━━━━━━━`,
                `Query: ${args.query}`,
                `Depth: ${depth}`,
                `Model: ${model}`,
                ``,
                content,
            ];

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            return `❌ Erreur Deep Search: ${err.message}`;
        }
    },
});
