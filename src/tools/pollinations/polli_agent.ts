import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import type { PollinationsModel } from '../../server/models/types.js';
import { checkCostControl } from './cost-guard.js';
import { formatCost, getApiKey, httpsPost, isCostEstimatorEnabled } from './shared.js';
import { t } from '../../locales/index.js';

const PROMPT_AGENT_MAX_STEPS = 8;
const PROMPT_AGENT_MAX_TOOL_CALLS = 16;
const ASSUMED_OUTPUT_TOKENS_PER_STEP = 2048;
const MIN_PROMPT_TOKENS_PER_STEP = 4096;

interface AgentEstimate {
    maxCost: number;
    modelCost: number;
    toolReserve: number;
    runtime: 'prompt' | 'unknown';
    steps?: number;
    toolCalls?: number;
}

function findManagedAgent(name: string): PollinationsModel | undefined {
    const normalized = name.replace(/^pollinations\//, '');
    return ModelRegistry.all().find((m) => {
        if (m.agent !== true) return false;
        if (m.name === normalized || m.name === name) return true;
        if (m.aliases?.includes(normalized) || m.aliases?.includes(name)) return true;
        if (m.name.replace(/^community\//, '') === normalized) return true;
        return false;
    });
}

function n(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function estimateManagedAgentCost(agent: PollinationsModel, task: string, budget: number): AgentEstimate {
    // Public prompt-agent listings expose base_model. Endpoint/code agents do
    // not reliably expose their inner loop, so they are treated as unknown and
    // deliberately estimated above the configured budget to force confirmation.
    if (!agent.base_model) {
        return {
            runtime: 'unknown',
            modelCost: 0,
            toolReserve: Math.max(0.25, budget * 0.5),
            maxCost: Math.max(0.75, budget * 1.25),
        };
    }

    const pricing: any = agent.pricing || {};
    const promptRate = n(pricing.promptTextTokens);
    const outputRate = n(pricing.completionTextTokens);
    const reasoningRate = n(pricing.completionReasoningTokens);

    // Conservative context-growth model: charge a first-step prompt floor and
    // assume it can accumulate across all 8 hosted prompt-agent model steps.
    const taskTokens = Math.ceil(task.length / 4);
    const firstStepPrompt = Math.max(MIN_PROMPT_TOKENS_PER_STEP, taskTokens + 2048);
    const cumulativePromptFactor = (PROMPT_AGENT_MAX_STEPS * (PROMPT_AGENT_MAX_STEPS + 1)) / 2; // 36
    const promptTokens = firstStepPrompt * cumulativePromptFactor;
    const outputTokens = ASSUMED_OUTPUT_TOKENS_PER_STEP * PROMPT_AGENT_MAX_STEPS;

    const modelCost =
        (promptTokens * promptRate) +
        (outputTokens * outputRate) +
        (outputTokens * reasoningRate);

    // The public model listing does not expose selected MCP servers. Reserve a
    // substantial fraction of the per-run budget whenever the agent advertises
    // tools. Pollinations MCP generations remain variable, so this is explicitly
    // an estimate rather than a server-side cap.
    const toolReserve = agent.tools === true ? Math.max(0.25, budget * 0.5) : 0;
    const uncertaintyMultiplier = agent.tools === true ? 1.5 : 1.25;
    const maxCost = Math.max(0.01, (modelCost + toolReserve) * uncertaintyMultiplier);

    return {
        runtime: 'prompt',
        modelCost,
        toolReserve,
        maxCost,
        steps: PROMPT_AGENT_MAX_STEPS,
        toolCalls: agent.tools === true ? PROMPT_AGENT_MAX_TOOL_CALLS : 0,
    };
}

function extractAssistantText(payload: any): string {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part: any) => part?.text || part?.content || '')
            .filter(Boolean)
            .join('\n');
    }
    if (typeof payload?.output_text === 'string') return payload.output_text;
    return '';
}

export const polliAgentTool: ToolDefinition = tool({
    description: t('tools.polli_agent.desc'),
    args: {
        agent: tool.schema.string().describe(t('tools.polli_agent.arg_agent')),
        task: tool.schema.string().describe(t('tools.polli_agent.arg_task')),
    },

    async execute(args, context) {
        const config = loadConfig();
        if (config.managedAgents?.enabled === false) {
            return t('tools.polli_agent.disabled');
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            return t('tools.polli_agent.req_key');
        }

        if (!ModelRegistry.isReady()) {
            await ModelRegistry.refresh(apiKey);
        }

        const agent = findManagedAgent(args.agent);
        if (!agent) {
            return t('tools.polli_agent.unknown', { agent: args.agent });
        }

        const budget = Number(config.managedAgents?.budget ?? 0.60);
        const estimate = estimateManagedAgentCost(agent, args.task, budget);

        const costCheck = checkCostControl(
            'polli_agent',
            args,
            agent.name,
            estimate.maxCost,
            'text',
            {
                costLimit: budget,
                confirmationRequired: true,
                enablePaidTools: config.enablePaidTools !== false,
                estimatedIsMax: true,
            },
        );

        if (!costCheck.allowed) {
            const detail = t('tools.polli_agent.estimate_block', {
                agent: agent.name,
                estimate: formatCost(estimate.maxCost),
                budget: formatCost(budget),
                runtime: estimate.runtime,
            });
            return `${detail}\n\n${costCheck.message || ''}`.trim();
        }

        context.metadata({
            title: t('tools.polli_agent.toast_start', {
                agent: agent.title || agent.name,
                estimate: formatCost(estimate.maxCost),
            }),
        });

        try {
            const response = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: agent.name,
                    messages: [{ role: 'user', content: args.task }],
                    stream: false,
                },
                { Authorization: `Bearer ${apiKey}` },
            );

            const data = JSON.parse(response.data.toString('utf8'));
            const text = extractAssistantText(data);
            if (!text) {
                return t('tools.polli_agent.empty');
            }

            const lines = [
                t('tools.polli_agent.result_title', { agent: agent.title || agent.name }),
            ];

            if (isCostEstimatorEnabled()) {
                lines.push(t('tools.polli_agent.result_estimate', {
                    estimate: formatCost(estimate.maxCost),
                    budget: formatCost(budget),
                }));
                if (estimate.runtime === 'prompt') {
                    lines.push(t('tools.polli_agent.result_bounds', {
                        steps: estimate.steps || PROMPT_AGENT_MAX_STEPS,
                        tools: estimate.toolCalls || 0,
                    }));
                } else {
                    lines.push(t('tools.polli_agent.result_unknown_runtime'));
                }
            }

            lines.push('', text);
            return lines.join('\n');
        } catch (err: any) {
            const message = String(err?.message || err);
            if (message.includes('402') || /payment/i.test(message)) {
                return t('tools.polli_agent.err_payment');
            }
            if (message.includes('401') || message.includes('403')) {
                return t('tools.polli_agent.err_auth');
            }
            return t('tools.polli_agent.err_generic', { error: message });
        }
    },
});
