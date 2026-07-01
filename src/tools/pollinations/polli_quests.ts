import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import { loadConfig } from '../../server/config.js';
import { t } from '../../locales/index.js';

// ─── Types (mirrors GET /account/quests response) ─────────────────────────

interface QuestReward {
    pollenAmount: number;
    balanceBucket: string;
    claimedAt: string | null;
}

interface QuestItem {
    id: string;
    title: string;
    description?: string;
    category: string;
    state: 'available' | 'completed' | 'coming_soon';
    rewardAmount: number;
    balanceBucket: 'tier' | 'pack';
    url?: string | null;
    reward?: QuestReward | null;
}

// ─── API ───────────────────────────────────────────────────────────────────

function fetchQuests(apiKey: string): Promise<QuestItem[]> {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'gen.pollinations.ai',
            path: '/account/quests',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'opencode-pollinations-plugin'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`API ${res.statusCode}: ${data.substring(0, 120)}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    resolve(Array.isArray(parsed?.quests) ? parsed.quests : []);
                } catch (e: any) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });
        req.on('error', (e) => reject(new Error(`Network: ${e.message}`)));
        req.setTimeout(10000, () => req.destroy(new Error('Timeout')));
        req.end();
    });
}

// ─── Category labels (emoji map) ────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
    setup: '🔧', grow: '🌱', build: '🏗️', contribute: '🤝', community: '💬', easteregg: '🥚'
};

// ─── Shared report builder (used by both the tool and the /poll quests command) ───

export async function buildQuestsReport(filter: 'all' | 'available' | 'claimable' = 'all'): Promise<string> {
    const config = loadConfig();
    if (!config.apiKey) {
        return t('tools.polli_quests.no_key');
    }

    let quests: QuestItem[];
    try {
        quests = await fetchQuests(config.apiKey);
    } catch (e: any) {
        return t('tools.polli_quests.error', { error: e.message });
    }

    if (quests.length === 0) {
        return t('tools.polli_quests.empty');
    }

    // Compute claimable (earned but not yet claimed) total
    let claimablePollen = 0;
    let claimableCount = 0;
    for (const q of quests) {
        if (q.reward && !q.reward.claimedAt) {
            claimablePollen += q.reward.pollenAmount || 0;
            claimableCount++;
        }
    }

    const lines: string[] = [];
    lines.push(t('tools.polli_quests.title'));
    lines.push('');

    // Highlight claimable Pollen (the porter message)
    if (claimableCount > 0) {
        lines.push(t('tools.polli_quests.claimable', {
            count: claimableCount,
            pollen: claimablePollen.toFixed(2)
        }));
        lines.push('');
    }

    if (filter === 'claimable') {
        const claimables = quests.filter(q => q.reward && !q.reward.claimedAt);
        if (claimables.length === 0) return t('tools.polli_quests.none_claimable');
        for (const q of claimables) {
            lines.push(`- 🎁 **${q.title}** — ${(q.reward!.pollenAmount).toFixed(2)} 🌻 (${q.balanceBucket})`);
        }
        lines.push('');
        lines.push(t('tools.polli_quests.claim_hint'));
        return lines.join('\n');
    }

    // Group by category
    const byCat = new Map<string, QuestItem[]>();
    for (const q of quests) {
        if (filter === 'available' && q.state !== 'available') continue;
        if (!byCat.has(q.category)) byCat.set(q.category, []);
        byCat.get(q.category)!.push(q);
    }

    for (const [cat, items] of byCat) {
        const emoji = CATEGORY_EMOJI[cat] || '•';
        lines.push(`### ${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
        for (const q of items) {
            let mark: string;
            if (q.reward && !q.reward.claimedAt) mark = '🎁'; // earned, unclaimed
            else if (q.reward && q.reward.claimedAt) mark = '✅'; // claimed
            else if (q.state === 'completed') mark = '✔️';
            else if (q.state === 'coming_soon') mark = '🔜';
            else mark = '⬜'; // available, not done
            const reward = q.rewardAmount > 0 ? ` (+${q.rewardAmount} 🌻)` : '';
            lines.push(`- ${mark} ${q.title}${reward}`);
        }
        lines.push('');
    }

    lines.push(t('tools.polli_quests.legend'));
    if (claimableCount > 0) {
        lines.push('');
        lines.push(t('tools.polli_quests.claim_hint'));
    }

    return lines.join('\n');
}

// ─── Tool ────────────────────────────────────────────────────────────────

export const polliQuestsTool: ToolDefinition = tool({
    description: t('tools.polli_quests.desc'),
    args: {
        filter: tool.schema.enum(['all', 'available', 'claimable']).optional()
            .describe(t('tools.polli_quests.arg_filter'))
    },
    async execute(args) {
        return buildQuestsReport(args.filter || 'all');
    }
});
