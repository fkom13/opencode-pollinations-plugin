/**
 * Tool Registry — Conditional Injection System
 *
 * Free Universe (no key): 8 tools always available
 * Enter Universe (with key): +7 Pollinations tools (dont beta_discovery)
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

// === ENTER TOOLS (Require API key) ===
import { genImageTool } from './pollinations/gen_image.js';
import { genVideoTool } from './pollinations/gen_video.js';
import { genAudioTool } from './pollinations/gen_audio.js';
import { transcribeAudioTool } from './pollinations/transcribe_audio.js';
import { genMusicTool } from './pollinations/gen_music.js';
import { polliWebSearchTool } from './pollinations/polli_web_search.js';
import { betaDiscoveryTool } from './pollinations/beta_discovery.js'; // ← NOUVEAU

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

    log(`Free tools injected: ${Object.keys(tools).length}`);

    // === ENTER UNIVERSE: Only with valid API key (+7 tools) ===
    if (keyPresent) {
        // Pollinations media tools
        tools['gen_image'] = genImageTool;
        tools['gen_video'] = genVideoTool;
        tools['gen_audio'] = genAudioTool;
        tools['transcribe_audio'] = transcribeAudioTool;
        tools['gen_music'] = genMusicTool;

        // Unified search tool
        tools['polli_web_search'] = polliWebSearchTool;

        // 🔬 Beta Discovery — explorateur de paramètres/enums non documentés
        tools['beta_discovery'] = betaDiscoveryTool;

        log(`Enter tools injected (key detected). Total: ${Object.keys(tools).length}`);
    } else {
        log(`Enter tools SKIPPED (no key). Total: ${Object.keys(tools).length}`);
    }

    return tools;
}

// Re-export for convenience
export {
    genImageTool,
    genVideoTool,
    genAudioTool,
    transcribeAudioTool,
    genMusicTool,
    polliWebSearchTool,
    betaDiscoveryTool,
};
