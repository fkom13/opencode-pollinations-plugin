import { polliGenImageTool } from '../../tools/pollinations/gen_image.js';
import { polliGenVideoTool } from '../../tools/pollinations/gen_video.js';
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
        try {
            // -- Patch VIDEO Tool --
            const videoModels = ModelRegistry.list('video');

            if (videoModels.length > 0 && polliGenVideoTool.description) {
                let videoTable = `\n\n**🎬 Modèles Vidéo Détectés (${videoModels.length}) :**\n`;
                videoTable += `| Modèle | Source I/O | Audio | 1 pollen ≈ | Specs |\n`;
                videoTable += `|--------|------------|-------|------------|-------|\n`;

                for (const m of videoModels) {
                    // Estimation pour une vidéo moyenne de 6 secondes
                    const cost = estimateVideoCost(m.name, 6);
                    const price = cost ? `${per1pollen(cost)} vidéos` : 'inconnu';
                    // durationRange et aspectRatios arrivent du fetcher (ou fallback)
                    const specs = `${m.durationRange ? m.durationRange.join('-') + 's' : '?s'} / ${m.aspectRatios ? m.aspectRatios.length : '?'} ratios`;
                    const badge = m.paid_only ? '💎' : '🌿';
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
                imageTable += `| Modèle | I2I | Qualité | 1 pollen ≈ |\n`;
                imageTable += `|--------|-----|---------|------------|\n`;

                // Afficher max 20 modèles pour éviter de saturer le prompt LLM
                for (const m of imageModels.slice(0, 20)) {
                    const cost = estimateImageCost(m.name);
                    const price = cost ? `${per1pollen(cost)} images` : 'inconnu';
                    const badge = m.paid_only ? '💎' : '🌿';
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

            log(`[ToolWorker] Propriétés (descriptions) des outils mises à jour via ModelRegistry.`);

        } catch (e) {
            log(`[ToolWorker] Error patching tools: ${e}`);
        }
    }
}
