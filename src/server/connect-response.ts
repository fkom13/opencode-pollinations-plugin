import { PollinationsConfigV5 } from './config.js';
import { t } from '../locales/index.js';
import { getQuotaStatus } from './quota.js';

export async function buildConnectResponse(config: PollinationsConfigV5): Promise<string> {
    const hasKey = !!config.apiKey;
    const mode = config.mode;

    let name = "Developer";
    let questEmoji = '🎁';
    let questText = 'Quest/Paid';

    if (hasKey) {
        try {
            // v6.5: Quest/Paid semantics (tier/refill model removed upstream).
            const quota = await getQuotaStatus(true);
            questText = `Quest ~${quota.questBalance.toFixed(2)} | Paid ~${quota.walletBalance.toFixed(2)}`;
        } catch (e) {
            // Ignorer l'erreur réseau et garder les valeurs par défaut
        }

        try {
            const res = await fetch('https://gen.pollinations.ai/account/profile', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
                const data: any = await res.json();
                if (data.githubUsername) name = data.githubUsername;
            }
        } catch (e) {
            // Ignorer
        }
    }

    if (hasKey) {
        return `${t('connect_response.title_key', { name, mode })}

> **Your Pollen:** ${questEmoji} ${questText}

---

${t('connect_response.tools_intro')}

---

${t('connect_response.terminal_cmds')}
---

${t('connect_response.resources')}`;
    }

    let freeModelsText = `Modèles gratuits disponibles : \`openai-fast\`, \`gemini-fast\`, \`mistral\`, \`qwen-coder\`, \`nova-fast\``;
    try {
        const freeRes = await fetch('https://text.pollinations.ai/models', { signal: AbortSignal.timeout(4000) });
        if (freeRes.ok) {
            const freeData = await freeRes.json();
            const modelsList = freeData.slice(0, 15).map((m: any) => `\`${m.name}\``).join(', ');
            freeModelsText = t('connect_response.free_models_success', { models: modelsList });
        } else {
            freeModelsText = t('connect_response.free_models_error');
        }
    } catch (e) {
        freeModelsText = t('connect_response.free_models_error');
    }

    return t('connect_response.onboarding', { freeText: freeModelsText });
}
