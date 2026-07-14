import { polliGenImageTool } from '../../tools/pollinations/gen_image.js';
import { polliGenVideoTool } from '../../tools/pollinations/gen_video.js';
import { polliGenAudioTool } from '../../tools/pollinations/gen_audio.js';
import { polliGenMusicTool } from '../../tools/pollinations/gen_music.js';
import { polliWebSearchTool } from '../../tools/pollinations/polli_web_search.js';
import { ModelRegistry } from './index.js';
import { log } from '../logger.js';
import { per1pollen, estimateImageCost, estimateVideoCost } from '../../tools/pollinations/shared.js';

/**
 * ToolRegistryWorker
 * Responsabilité : Patcher dynamiquement la propriété "description" des Tools statiques
 * (ex: polliGenImageTool, polliGenVideoTool) pour y injecter le catalogue temps réel
 * rapatrié par le ModelRegistry.
 */
export class ToolRegistryWorker {
    private static isRunning = false;
    private static interval: NodeJS.Timeout | null = null;
    private static isPatching = false; // Mutex (HIGH-02)

    // Fréquence de vérification des modifications du registre (en ms)
    private static CHECK_INTERVAL = 60000; // 1 minute

    /**
     * Démarre le Worker en tâche de fond.
     */
    static start() {
        if (this.isRunning) return;
        this.isRunning = true;

        log('[ToolWorker] Démarrage du patcher dynamique...');

        // Exécution immédiate
        this.patchTools();

        // Setup de l'intervalle
        this.interval = setInterval(() => {
            if (ModelRegistry.isReady()) {
                this.patchTools();
            }
        }, this.CHECK_INTERVAL);
    }

    static stop() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
        log('[ToolWorker] Stoppé');
    }

    /**
     * Lit le registre en mémoire et injecte les listes Markdown formatées
     * dans les propriétés ToolDefinition.description
     */
    private static patchTools() {
        if (this.isPatching) return;
        this.isPatching = true;
        try {
            // -- Patch VIDEO Tool --
            const videoModels = ModelRegistry.list('video');

            if (videoModels.length > 0 && polliGenVideoTool.description) {
                let videoTable = `\n\n**🎬 Modèles Vidéo Détectés (${videoModels.length}) :**\n`;
                videoTable += `*(Légende: [💎 Paid] = Enter Tier (Consomme le Wallet USD), [🌿 Free] = Free Tier (Consomme d'abord le Quota Pollen Gratuit Journalier))*\n`;
                videoTable += `| Modèle | Source I/O | Audio | 1 pollen ≈ | Specs |\n`;
                videoTable += `|--------|------------|-------|------------|-------|\n`;

                for (const m of videoModels) {
                    const cost = estimateVideoCost(m.name, 6);
                    const price = cost ? `${per1pollen(cost)} vidéos` : 'inconnu';
                    const specs = `${m.durationRange ? m.durationRange.join('-') + 's' : '?s'} / ${m.aspectRatios ? m.aspectRatios.length : '?'} ratios`;
                    const isCommunity = (m as any).community === true || m.name.includes('/');
                    const badge = isCommunity ? '[👥]' : (m.paid_only ? '[💎 Paid]' : '[🌿 Free]');
                    videoTable += `| \`${m.name}\` ${badge} | ${m.supportsI2X ? 'T2V/I2V' : 'T2V'} | ${m.output_modalities?.includes('audio') || m.name === 'grok-video' ? '✅' : '❌'} | ${price} | ${specs} |\n`;
                }

                if (!polliGenVideoTool.description.includes('**🎬 Modèles Vidéo Détectés')) {
                    polliGenVideoTool.description += videoTable;
                } else {
                    polliGenVideoTool.description = polliGenVideoTool.description.split('**🎬 Modèles Vidéo Détectés')[0] + videoTable;
                }
            }

            // -- Patch IMAGE Tool --
            const imageModels = ModelRegistry.list('image');

            if (imageModels.length > 0 && polliGenImageTool.description) {
                let imageTable = `\n\n**🎨 Modèles Image Détectés (${imageModels.length}) :**\n`;
                imageTable += `*(Légende: [💎 Paid] = Enter Tier (Consomme le Wallet USD), [🌿 Free] = Free Tier (Consomme d'abord le Quota Pollen Gratuit Journalier))*\n`;
                imageTable += `| Modèle | I2I | Qualité | 1 pollen ≈ |\n`;
                imageTable += `|--------|-----|---------|------------|\n`;

                // Afficher max 20 modèles pour éviter de saturer le prompt LLM
                for (const m of imageModels.slice(0, 20)) {
                    const cost = estimateImageCost(m.name);
                    const price = cost ? `${per1pollen(cost)} images` : 'inconnu';
                    const isCommunity = (m as any).community === true || m.name.includes('/');
                    const badge = isCommunity ? '[👥]' : (m.paid_only ? '[💎 Paid]' : '[🌿 Free]');
                    imageTable += `| \`${m.name}\` ${badge} | ${m.supportsI2X ? '✅' : '❌'} | Standard | ${price} |\n`;
                }

                if (imageModels.length > 20) {
                    imageTable += `| *(+${imageModels.length - 20} autres)* | ... | ... | ... |\n`;
                }

                if (!polliGenImageTool.description.includes('**🎨 Modèles Image Détectés')) {
                    polliGenImageTool.description += imageTable;
                } else {
                    polliGenImageTool.description = polliGenImageTool.description.split('**🎨 Modèles Image Détectés')[0] + imageTable;
                }
            }

            // -- Patch AUDIO / MUSIC Tool --
            const audioModels = ModelRegistry.list('audio');

            if (audioModels.length > 0 && polliGenAudioTool.description && polliGenMusicTool.description) {
                let audioTable = `\n\n**🎵 Modèles Audio/Music Détectés (${audioModels.length}) :**\n`;
                audioTable += `*(Légende: [💎 Paid] = Enter Tier (Consomme le Wallet USD), [🌿 Free] = Free Tier (Consomme d'abord le Quota Pollen Gratuit Journalier))*\n`;
                audioTable += `| Modèle | Durée max | Qualité |\n`;
                audioTable += `|--------|-----------|---------|\n`;

                for (const m of audioModels) {
                    const isCommunity = (m as any).community === true || m.name.includes('/');
                    const badge = isCommunity ? '[👥]' : (m.paid_only ? '[💎 Paid]' : '[🌿 Free]');
                    const duration = m.durationRange ? `${m.durationRange.join('-')}s` : 'Standard';
                    audioTable += `| \`${m.name}\` ${badge} | ${duration} | Standard |\n`;
                }

                if (!polliGenAudioTool.description.includes('**🎵 Modèles Audio/Music Détectés')) {
                    polliGenAudioTool.description += audioTable;
                    if (polliGenMusicTool.description && !polliGenMusicTool.description.includes('**🎵 Modèles Audio/Music Détectés')) {
                        polliGenMusicTool.description += audioTable;
                    }
                } else {
                    polliGenAudioTool.description = polliGenAudioTool.description.split('**🎵 Modèles Audio/Music Détectés')[0] + audioTable;
                    if (polliGenMusicTool.description) {
                        polliGenMusicTool.description = polliGenMusicTool.description.split('**🎵 Modèles Audio/Music Détectés')[0] + audioTable;
                    }
                }
            }

            // -- Patch WEB SEARCH Tool --
            const textModels = ModelRegistry.list('text');

            if (textModels.length > 0 && polliWebSearchTool.description) {
                // Filtres selon la volonté stricte utilisateur (inclut explicitement les "gemini", "search", "web", "github", "perplexity")
                const searchKeywords = ['search', 'web', 'github', 'perplexity', 'gemini'];

                const searchModels = textModels.filter(m => {
                    const str = `${m.name} ${m.description} ${m.aliases?.join(' ')}`.toLowerCase();
                    return searchKeywords.some(kw => str.includes(kw));
                });

                if (searchModels.length > 0) {
                    let searchTable = `\n\n**🌍 Modèles de Recherche & Grounding Détectés (${searchModels.length}) :**\n`;
                    searchTable += `*(Légende: [💎 Paid] = Enter Tier, [🌿 Free] = Quota Gratuit. Obligatoire de choisir un modèle exact au lieu de 'deep' ou 'rapid' !)*\n`;
                    searchTable += `| Modèle | Description / Specs |\n`;
                    searchTable += `|--------|---------------------|\n`;

                    for (const m of searchModels) {
                        const isCommunity = (m as any).community === true || m.name.includes('/');
                        const badge = isCommunity ? '[👥]' : (m.paid_only ? '[💎 Paid]' : '[🌿 Free]');
                        // Clean markdown piping conflicts
                        let cleanDesc = m.description.replace(/\|/g, '-');

                        // Adding "Specialized" hint
                        let hint = '';
                        const lname = m.name.toLowerCase();
                        if (lname.includes('nomnom')) hint = ' *(Extensif Scrape)*';
                        if (lname.includes('polly')) hint = ' *(Code/GitHub)*';
                        if (lname.includes('gemini-search')) hint = ' *(Rapide Google)*';
                        if (lname.includes('perplexity')) hint = ' *(Sonar Web)*';

                        searchTable += `| \`${m.name}\` ${badge} | ${cleanDesc}${hint} |\n`;
                    }

                    if (!polliWebSearchTool.description.includes('**🌍 Modèles de Recherche & Grounding Détectés')) {
                        polliWebSearchTool.description += searchTable;
                    } else {
                        polliWebSearchTool.description = polliWebSearchTool.description.split('**🌍 Modèles de Recherche & Grounding Détectés')[0] + searchTable;
                    }
                }
            }

            log(`[ToolWorker] Propriétés (descriptions) des outils mises à jour via ModelRegistry.`);

        } catch (e) {
            log(`[ToolWorker] Error patching tools: ${e}`);
        } finally {
            this.isPatching = false;
        }
    }
}
