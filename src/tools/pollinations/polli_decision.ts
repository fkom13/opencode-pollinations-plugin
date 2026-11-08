/**
 * Typed decisions via Pollinations' public decision-model catalog.
 *
 * Zero-cost models are preferred live; paid/Quest models are never selected
 * silently. Even an explicitly requested billed model needs the existing
 * pending-request confirmation flow. This is not a no-key service.
 */
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { getApiKey, httpsGet, httpsPost } from './shared.js';
import { checkCostControl } from './cost-guard.js';

const MODELS_URL = 'https://gen.pollinations.ai/models?category=decision&limit=100';
const DECISIONS_URL = 'https://gen.pollinations.ai/alpha/decisions';

type DecisionModel = {
  id?: string; name?: string; aliases?: string[]; paidOnly?: boolean; paid_only?: boolean;
  pricing?: Record<string, unknown>; health?: { status?: string };
};

export function isFreeDecisionModel(model: DecisionModel): boolean {
  // Unknown metadata is NOT evidence of a free tier: fail closed.
  if (model.paidOnly !== false && model.paid_only !== false) return false;
  if (model.paidOnly === true || model.paid_only === true) return false;
  const price = model.pricing;
  if (!price || price.currency !== 'pollen') return false;
  // A currency-only object is *unpriced*, not a verified zero-cost model.
  // Without at least one explicit numerical rate, fail closed.
  if (!Object.keys(price).some(key => key !== 'currency')) return false;
  return Object.entries(price).every(([key, value]) => {
    if (key === 'currency') return true;
    if (value === null || value === undefined || String(value).trim() === '') return false;
    const n = Number(value);
    return Number.isFinite(n) && n === 0;
  });
}

function healthy(model: DecisionModel): boolean {
  return model.health?.status !== 'down';
}

function rank(model: DecisionModel): number {
  const status = model.health?.status;
  return status === 'healthy' ? 0 : status === 'unknown' ? 1 : 2;
}

export function chooseDecisionModel(models: DecisionModel[], requested?: string): DecisionModel | null {
  if (requested) {
    return models.find(m =>
      (m.id || m.name) === requested || m.aliases?.includes(requested)
    ) || null;
  }
  return models.filter(m => healthy(m) && isFreeDecisionModel(m))
    .sort((a, b) => rank(a) - rank(b))[0] || null;
}

function validateQuestions(raw: string): Record<string, unknown> {
  if (raw.length > 30000) throw new Error('questions_json is too large (max 30000 characters)');
  const questions = JSON.parse(raw);
  if (!questions || typeof questions !== 'object' || Array.isArray(questions)) {
    throw new Error('questions_json must contain an object keyed by question name');
  }
  const entries = Object.entries(questions);
  if (entries.length < 1 || entries.length > 20) throw new Error('Provide 1 to 20 questions');
  for (const [name, q] of entries) {
    if (!name || name.length > 80 || !q || typeof q !== 'object' || Array.isArray(q)) {
      throw new Error('Invalid question name or object');
    }
    const question = q as Record<string, unknown>;
    if (!['choice', 'score', 'noul'].includes(String(question.type))) {
      throw new Error('Each question type must be choice, score, or noul');
    }
    if (typeof question.instructions !== 'string' || !question.instructions.trim()) {
      throw new Error('Each question needs instructions');
    }
    if (question.type === 'choice' && (!question.criteria || typeof question.criteria !== 'object' || Array.isArray(question.criteria))) {
      throw new Error('choice questions require a criteria object');
    }
  }
  return questions as Record<string, unknown>;
}

function estimateBilledCost(model: DecisionModel, input: string): number {
  const prices = model.pricing || {};
  const tokens = Math.max(2048, Math.ceil(input.length / 3));
  const inputRate = Number(prices.promptTextTokens || 0);
  const outputRate = Number(prices.completionTextTokens || 0);
  // Estimate only. The confirmation response discloses the uncertainty.
  return Math.max(0.000001, tokens * inputRate * 2 + 2048 * outputRate * 2);
}

export const polliDecisionTool: ToolDefinition = tool({
  description: 'Typed decisions (choice, score, noul) using live Pollinations decision models. Defaults to a healthy zero-price model when available. Billed models require allow_paid=true and explicit confirmation. A Pollinations key with decision permission is required.',
  args: {
    state: tool.schema.string().min(1).max(50000).describe('Relevant factual context for the decision'),
    questions_json: tool.schema.string().describe('JSON object keyed by question name: {"urgent":{"type":"noul","instructions":"Is this urgent?"}}; choice additionally needs criteria'),
    model: tool.schema.string().optional().describe('Optional explicit canonical model ID or alias; defaults to a zero-cost model'),
    allow_paid: tool.schema.boolean().optional().describe('Must be true to request a billed model; a confirmation is still required'),
  },
  async execute(args, context) {
    const apiKey = getApiKey();
    if (!apiKey) return 'Pollinations API key required (decision permission on /alpha/decisions).';
    let questions: Record<string, unknown>;
    try { questions = validateQuestions(args.questions_json); }
    catch (error: any) { return 'Invalid questions_json: ' + String(error.message).slice(0, 180); }

    try {
      const response = await httpsGet(MODELS_URL);
      const json = JSON.parse(response.data.toString('utf8'));
      const models: DecisionModel[] = Array.isArray(json) ? json : (json.data || json.models || []);
      const candidate = chooseDecisionModel(models, args.model);
      if (!candidate) {
        const sample = models.filter(m => healthy(m)).slice(0, 8)
          .map(m => m.id || m.name).join(', ');
        return args.model
          ? 'Unknown decision model or alias: ' + args.model
          : 'No healthy zero-cost decision model is available. polli_decision remains available for explicit billed selection with allow_paid=true. Examples: ' + sample;
      }
      if (!healthy(candidate)) return 'Requested decision model is currently reported down.';
      const modelID = candidate.id || candidate.name;
      if (!modelID) return 'Model catalog entry has no canonical identifier.';
      // Respan only supports noul predicates with plain string instructions.
      if (modelID === 'respan/span-01-lite' && Object.values(questions).some((q: any) =>
        q.type !== 'noul' || typeof q.instructions !== 'string' || q.criteria !== undefined
      )) {
        return 'Model ' + modelID + ' accepts only noul questions with string instructions (no choice/score or criteria).';
      }
      const isFree = isFreeDecisionModel(candidate);
      if (!isFree) {
        if (args.allow_paid !== true) return 'Model ' + modelID + ' is not zero-cost. Set allow_paid=true for explicit confirmation; no request was sent.';
        const estimate = estimateBilledCost(candidate, args.state + args.questions_json);
        const guard = checkCostControl('polli_decision', args, modelID, estimate, 'decision', {
          confirmationRequired: true,
          costLimit: 0,
          estimatedIsMax: true,
        });
        if (!guard.allowed) return 'Billed decision model ' + modelID + ': ' + (guard.message || guard.reason || 'blocked');
      }
      context.metadata({ title: (isFree ? '🆓 ' : '🌸 ') + 'Pollinations Decision — ' + modelID });
      const result = await httpsPost(DECISIONS_URL, {
        model: modelID,
        state: args.state,
        questions,
      }, { Authorization: 'Bearer ' + apiKey });
      const data = JSON.parse(result.data.toString('utf8'));
      if (!data || typeof data !== 'object' || !data.answers) {
        return 'Unexpected response from decision API (no answers): ' + JSON.stringify(data).slice(0, 400);
      }
      return JSON.stringify({
        model: modelID,
        tier: isFree ? 'no numeric price advertised' : 'billed (confirmed)',
        answers: data.answers,
        usage: data.usage || null,
      }, null, 2);
    } catch (error: any) {
      return 'Pollinations decisions API error: ' + String(error?.message || error).slice(0, 320);
    }
  },
});
