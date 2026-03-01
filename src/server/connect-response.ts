import { PollinationsConfigV5 } from './config.js';
import { t } from '../locales/index.js';

export async function buildConnectResponse(config: PollinationsConfigV5): Promise<string> {
    const hasKey = !!config.apiKey;
    const mode = config.mode;

    let name = "Developer";
    let tier = "anonymous";

    if (hasKey) {
        try {
            const res = await fetch('https://gen.pollinations.ai/account/profile', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                if (data.name) name = data.name;
                tier = data.tier || "anonymous";
            }
        } catch (e) {
            // Ignorer l'erreur réseau et garder les valeurs par défaut
        }
    }

    const emojis: Record<string, string> = {
        microbe: '🦠', spore: '🍄', seed: '🌱', flower: '🌸', nectar: '🍯', anonymous: '👤'
    };
    const tierEmoji = emojis[tier] || '❓';

    if (hasKey) {
        return `${t('connect_response.title_key', { name, mode })}

> **Your Tiers:** ${tierEmoji} ${tier.toUpperCase()}

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
