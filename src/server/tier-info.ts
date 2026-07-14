/**
 * Tier Information - Central Configuration
 *
 * Hourly quota system (Pollinations API). Quotas refill every hour at :00.
 * Tiers mirror the official pollinations/shared/tier-config.ts.
 *
 * NOTE (2026-06): The legacy account-level upgrade paths (dev-points → Seed,
 * publish-app → Flower, admin tier-update) were removed upstream. Pollen is now
 * primarily earned by completing Quests. The `condition` fields below describe
 * the broad tier profile, not an automated upgrade trigger.
 */

import { t } from '../locales/index.js';

export interface TierInfo {
  name: string;
  emoji: string;
  hourlyPollen: number;
  dailyEstimate: number;
  condition: string;
  conditionKey: string; // For i18n
}

export const TIER_INFO: Record<string, TierInfo> = {
  microbe: {
    name: 'Microbe',
    emoji: '🦠',
    hourlyPollen: 0,
    dailyEstimate: 0,
    condition: 'Account under review',
    conditionKey: 'tier.condition.under_review',
  },
  spore: {
    name: 'Spore',
    emoji: '🍄',
    hourlyPollen: 0.01,
    dailyEstimate: 0.24,
    condition: 'New account (default)',
    conditionKey: 'tier.condition.default',
  },
  seed: {
    name: 'Seed',
    emoji: '🌱',
    hourlyPollen: 0.15,
    dailyEstimate: 3.6,
    condition: 'Active community member',
    conditionKey: 'tier.condition.community',
  },
  flower: {
    name: 'Flower',
    emoji: '🌸',
    hourlyPollen: 0.4,
    dailyEstimate: 9.6,
    condition: 'Complete Quests & contribute',
    conditionKey: 'tier.condition.quests',
  },
  nectar: {
    name: 'Nectar',
    emoji: '🍯',
    hourlyPollen: 0.8,
    dailyEstimate: 19.2,
    condition: 'Top contributor',
    conditionKey: 'tier.condition.top_contributor',
  },
  router: {
    name: 'Router',
    emoji: '🐝',
    hourlyPollen: 10,
    dailyEstimate: 240,
    condition: 'Special / invite-only',
    conditionKey: 'tier.condition.special',
  },
};

/**
 * Get tier info by name
 */
export function getTierInfo(tierName: string): TierInfo | undefined {
  return TIER_INFO[tierName.toLowerCase()];
}

/**
 * Get all tiers as array (sorted by hourlyPollen)
 */
export function getAllTiers(): TierInfo[] {
  return Object.values(TIER_INFO).sort((a, b) => a.hourlyPollen - b.hourlyPollen);
}

/**
 * Format tier list for display (markdown table)
 */
export function formatTierTable(lang: 'en' | 'fr' | 'es' | 'de' | 'it' | 'zh' = 'en'): string {
  const tiers = getAllTiers();
  
  const headers: Record<string, string> = {
    en: '| Tier | Hourly | Daily (est.) | Condition |',
    fr: '| Palier | Horaire | Journalier (est.) | Condition |',
    es: '| Nivel | Por hora | Diario (est.) | Condición |',
    de: '| Stufe | Pro Stunde | Täglich (ca.) | Bedingung |',
    it: '| Livello | Orario | Giornaliero (stima) | Condizione |',
    zh: '| 等级 | 每小时 | 每日 (估算) | 条件 |',
  };

  const separator = '|------|---------|----------------|-----------|';

  const rows = tiers.map(tier => {
    const conditionText = t(tier.conditionKey);
    return `| ${tier.emoji} **${tier.name}** | **${tier.hourlyPollen} pollen/h** | ~${tier.dailyEstimate}/day | ${conditionText} |`;
  });

  return [headers[lang] || headers.en, separator, ...rows].join('\n');
}

/**
 * Get dynamic tier description with hourly rates
 */
export function getTierDescription(lang: 'en' | 'fr' | 'es' | 'de' | 'it' | 'zh' = 'en'): string {
  const perHour = lang === 'fr' ? '/heure' : '/hour';
  const perDay = lang === 'fr' ? '/jour (est.)' : '/day (est.)';

  const tiers = getAllTiers();

  const lines = tiers.map(tier => {
    const conditionText = t(tier.conditionKey);
    return `- ${tier.emoji} **${tier.name}** (**${tier.hourlyPollen} Pollen${perHour}** ≈ ~${tier.dailyEstimate}${perDay}) : ${conditionText}`;
  });

  return lines.join('\n');
}
