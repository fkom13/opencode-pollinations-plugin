/**
 * Tool Registry — Conditional Injection System
 * 
 * Free Universe (no key): 8 tools always available
 * Enter Universe (with key): +6 Pollinations tools
 * 
 * Tools are injected ONCE at plugin init. Restart needed after /poll connect.
 */

import { loadConfig } from '../server/config.js';

// === FREE TOOLS (Always available) ===
import { genQrcodeTool } from './design/gen_qrcode.js';
import { genDiagramTool } from './design/gen_diagram.js';
import { genPaletteTool } from './design/gen_palette.js';
import { fileToUrlTool } from './power/file_to_url.js';
import { removeBackgroundTool } from './power/remove_background.js';
import { extractFramesTool } from './power/extract_frames.js';
import { extractAudioTool } from './power/extract_audio.js';
import { rmbgKeysTool } from './power/rmbg_keys.js';

// === FREE BONUS: standalone always-free image gen/edit + video (no key, no Pollen) ===
import { genEditImageFreeTool } from './pollinations/gen_edit_image_free.js';
import { genVideoFreeTool } from './pollinations/gen_video_free.js';
import { polliLoginTool } from './pollinations/polli_login.js';

// === FREE BONUS: standalone image processing tools (no key, no API, direct calls) ===
import { objectRemoverTool } from './pollinations/object_remover.js';
import { imageUpscalerTool } from './pollinations/image_upscaler.js';
import { imageEnhancerTool } from './pollinations/image_enhancer.js';

// === ENTER TOOLS (Require API key) ===
import { polliGenImageTool } from './pollinations/gen_image.js';
import { polliGenVideoTool } from './pollinations/gen_video.js';
import { polliGenAudioTool } from './pollinations/gen_audio.js';
import { polliSttTool } from './pollinations/transcribe_audio.js';
import { polliGenMusicTool } from './pollinations/gen_music.js';
import { polliGen3dTool } from './pollinations/gen_3d.js';
import { polliWebSearchTool } from './pollinations/polli_web_search.js';
import { polliBetaDiscoveryTool } from './pollinations/beta_discovery.js';
import { polliGenConfirmTool } from './pollinations/polli_gen_confirm.js';
import { polliStatusTool } from './pollinations/polli_status.js';
import { polliConfigTool } from './pollinations/polli_config.js';
import { polliQuestsTool } from './pollinations/polli_quests.js';

import * as fs from 'fs';

import * as os from 'os';
import * as path from 'path';
import { log } from '../server/logger.js';

/**
 * Detect if a valid API key is present
 */
function hasValidKey(): boolean {
    const config = loadConfig();
    return !!(config.apiKey && config.apiKey.length > 5 && config.apiKey !== 'dummy');
}

/**
 * Build the tool registry based on user's access level
 * 
 * @returns Record<string, Tool> to be spread into the plugin's tool: {} property
 */
export function createToolRegistry(): Record<string, any> {
    const tools: Record<string, any> = {};
    const keyPresent = hasValidKey();

    // === FREE UNIVERSE: Always injected (8 tools) ===

    // Design tools (3)
    tools['gen_qrcode'] = genQrcodeTool;
    tools['gen_diagram'] = genDiagramTool;
    tools['gen_palette'] = genPaletteTool;

    // Power tools (5)
    tools['file_to_url'] = fileToUrlTool;
    tools['remove_background'] = removeBackgroundTool;
    tools['extract_frames'] = extractFramesTool;
    tools['extract_audio'] = extractAudioTool;
    tools['rmbg_keys'] = rmbgKeysTool;

    // Bonus tool: always-free image gen/edit (works without a Pollinations key)
    tools['gen_edit_image_free'] = genEditImageFreeTool;

    // Bonus tool: always-free video generation (works without a Pollinations key)
    tools['gen_video_free'] = genVideoFreeTool;

    // Login tool: device-flow login, callable by any model (no key needed to run)
    tools['polli_login'] = polliLoginTool;

    // Standalone image processing tools (no key, no API, direct calls from user IP)
    tools['object_remover'] = objectRemoverTool;
    tools['image_upscaler'] = imageUpscalerTool;
    tools['image_enhancer'] = imageEnhancerTool;

    log(`Free tools injected: ${Object.keys(tools).length}`);

    // === ENTER UNIVERSE: Only with valid API key (+6 tools) ===
    if (keyPresent) {
        // Pollinations media tools
        tools['polli_gen_image'] = polliGenImageTool;
        tools['polli_gen_video'] = polliGenVideoTool;
        tools['polli_gen_audio'] = polliGenAudioTool;
        tools['polli_stt'] = polliSttTool;
        tools['polli_gen_music'] = polliGenMusicTool;
        tools['polli_gen_3d'] = polliGen3dTool;

        // Unified search tool
        tools['polli_web_search'] = polliWebSearchTool;

        // Cost Guard Confirmation tool
        tools['polli_gen_confirm'] = polliGenConfirmTool;

        // Model API discovery & diagnostics
        tools['polli_beta_discovery'] = polliBetaDiscoveryTool;

        // Plugin Configuration editor (Agents)
        tools['polli_config'] = polliConfigTool;

        // Plugin Status / Info / Pricing helper map
        tools['polli_status'] = polliStatusTool;

        // Quests — read-only quest status & claimable Pollen nudge
        tools['polli_quests'] = polliQuestsTool;

        log(`Enter tools injected (key detected). Total: ${Object.keys(tools).length}`);
    } else {
        // En mode gratuit, on ajoute quand meme polli_status mais restraint (il dira manque une clé pour full profile etc)
        tools['polli_status'] = polliStatusTool;
        log(`Enter tools SKIPPED (no key). Total: ${Object.keys(tools).length}`);
    }

    return tools;
}

// Re-export for convenience
export {
    polliGenImageTool,
    polliGenVideoTool,
    polliGenAudioTool,
    polliSttTool,
    polliGenMusicTool,
    polliGen3dTool,
    polliWebSearchTool,
    polliBetaDiscoveryTool,
    polliGenConfirmTool,
    polliStatusTool,
    polliConfigTool,
    polliQuestsTool
};
