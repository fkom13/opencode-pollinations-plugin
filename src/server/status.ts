
import { loadConfig } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';

export function createStatusHooks(client: any) {
    return {
        'session.idle': async () => {
            const config = loadConfig();

            // Si la barre de statut est activée via 'status_bar' (bool)
            // L'utilisateur peut l'activer via /pollinations config status_bar true

            if (config.statusBar) {
                const quota = await getQuotaStatus(false);
                const statusText = formatStatus(quota);

                try {
                    // ASTUCE: Toasts longue durée (30s) rafraîchis à chaque idle
                    // Simule un widget persistent à droite.
                    await client.tui.showToast({
                        body: {
                            message: statusText,
                            variant: 'info',
                            duration: 30000
                        }
                    });
                } catch (e) { }
            }
        }
    };
}

function formatStatus(quota: QuotaStatus): string {
    const tierName = quota.tier === 'alwaysfree' ? 'Free' : quota.tier;
    return `${tierName} ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} 🌼 | Wallet $${quota.walletBalance.toFixed(2)}`;
}
