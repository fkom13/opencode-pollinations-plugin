import { loadConfig } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';

export function createStatusHooks(client: any) {
    return {
        // [DEPRECATED] Hook session.idle supprimé car il polluait les autres providers.
        // Les notifications de statut sont désormais gérées par le proxy après chaque requête pollinations/enter.
    };
}

function formatStatus(quota: QuotaStatus): string {
    const tierName = quota.tier === 'alwaysfree' ? 'Free' : quota.tier;
    return `${tierName} ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} 🌼 | Wallet $${quota.walletBalance.toFixed(2)}`;
}