/**
 * Tier Information - Central Configuration
 * 
 * Hourly quota system (Pollinations API v2026-03)
 * Quotas reset every hour at :00
 */

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
    hourlyPollen: 0.01,
    dailyEstimate: 0.24,
    condition: 'Just register!',
    conditionKey: 'tier.condition.signup',
  },
  spore: {
    name: 'Spore',
    emoji: '🍄',
    hourlyPollen: 0.01,
    dailyEstimate: 0.24,
    condition: 'Automatic verification',
    conditionKey: 'tier.condition.auto_verify',
  },
  seed: {
    name: 'Seed',
    emoji: '🌱',
    hourlyPollen: 0.15,
    dailyEstimate: 3.6,
    condition: '8+ dev points (weekly auto-upgrade)',
    conditionKey: 'tier.condition.dev_points',
  },
  flower: {
    name: 'Flower',
    emoji: '🌸',
    hourlyPollen: 0.4,
    dailyEstimate: 9.6,
    condition: 'Publish an app',
    conditionKey: 'tier.condition.publish_app',
  },
  nectar: {
    name: 'Nectar',
    emoji: '🍯',
    hourlyPollen: 0.8,
    dailyEstimate: 19.2,
    condition: 'Coming soon 🔮',
    conditionKey: 'tier.condition.coming_soon',
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
export function formatTierTable(lang: 'en' | 'fr' | 'es' | 'de' | 'it' = 'en'): string {
  const tiers = getAllTiers();
  
  const headers = {
    en: '| Tier | Hourly | Daily (est.) | Condition |',
    fr: '| Palier | Horaire | Journalier (est.) | Condition |',
    es: '| Nivel | Por hora | Diario (est.) | Condición |',
    de: '| Stufe | Pro Stunde | Täglich (ca.) | Bedingung |',
    it: '| Livello | Orario | Giornaliero (stima) | Condizione |',
  };
  
  const separator = '|------|---------|----------------|-----------|';
  
  const rows = tiers.map(tier => {
    const conditionText = lang === 'fr' ? tier.condition : tier.condition;
    return `| ${tier.emoji} **${tier.name}** | **${tier.hourlyPollen} pollen/h** | ~${tier.dailyEstimate}/day | ${conditionText} |`;
  });
  
  return [headers[lang], separator, ...rows].join('\n');
}

/**
 * Get dynamic tier description with hourly rates
 */
export function getTierDescription(lang: 'en' | 'fr' | 'es' | 'de' | 'it' = 'en'): string {
  const isFrench = lang === 'fr';
  const pollenWord = isFrench ? 'Pollen' : 'Pollen';
  const perHour = isFrench ? '/heure' : '/hour';
  const perDay = isFrench ? '/jour (est.)' : '/day (est.)';
  
  const tiers = getAllTiers();
  
  const lines = tiers.map(tier => {
    const conditionText = isFrench ? 
      (tier.conditionKey === 'tier.condition.publish_app' ? '**Publier une App** (comme ce plugin !)' : tier.condition) :
      tier.condition;
    return `- ${tier.emoji} **${tier.name}** (**${tier.hourlyPollen} ${pollenWord}${perHour}** ≈ ~${tier.dailyEstimate}${perDay}) : ${conditionText}`;
  });
  
  return lines.join('\n');
}
