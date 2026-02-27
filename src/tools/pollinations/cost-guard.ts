/**
 * Cost Guard V2 — Wallet protection and Cost Confirmation System
 * 
 * Sprint 6: Refactored Cost Control based on user directives.
 * 
 * Rule 1 (enablePaidTools): Hard block for paid models if disabled.
 * Rule 2 (costConfirmationRequired): Suspends execution if cost > threshold, returns an ID.
 */

import { loadConfig } from '../../server/config.js';
import { emitStatusToast } from '../../server/toast.js';
import { ModelRegistry } from '../../server/models/index.js';
import { formatCost } from './shared.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Types ───────────────────────────────────────────────────────────────

export interface CostCheckResult {
    allowed: boolean;
    reason?: string;
    confirmationRequired?: boolean;
    pendingRequestId?: string;
    message?: string;
}

// ─── Pending Requests Store ────────────────────────────────────────────────

const PENDING_STORE_PATH = path.join(os.homedir(), '.config', 'opencode', 'pollinations_pending_requests.json');

export interface PendingRequest {
    id: string;
    toolName: string;
    args: any;
    estimatedCost: number;
    model: string;
    timestamp: number;
}

export function savePendingRequest(req: PendingRequest) {
    const dir = path.dirname(PENDING_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let pending: Record<string, PendingRequest> = {};
    if (fs.existsSync(PENDING_STORE_PATH)) {
        try { pending = JSON.parse(fs.readFileSync(PENDING_STORE_PATH, 'utf-8')); } catch (e) { }
    }
    pending[req.id] = req;
    fs.writeFileSync(PENDING_STORE_PATH, JSON.stringify(pending, null, 2));
}

export function getPendingRequest(id: string): PendingRequest | null {
    if (!fs.existsSync(PENDING_STORE_PATH)) return null;
    try {
        const pending: Record<string, PendingRequest> = JSON.parse(fs.readFileSync(PENDING_STORE_PATH, 'utf-8'));
        return pending[id] || null;
    } catch (e) {
        return null; // File corrupted or unreadable
    }
}

export function removePendingRequest(id: string) {
    if (!fs.existsSync(PENDING_STORE_PATH)) return;
    try {
        const pending: Record<string, PendingRequest> = JSON.parse(fs.readFileSync(PENDING_STORE_PATH, 'utf-8'));
        if (pending[id]) {
            delete pending[id];
            fs.writeFileSync(PENDING_STORE_PATH, JSON.stringify(pending, null, 2));
        }
    } catch (e) { }
}

// ─── Main Function ───────────────────────────────────────────────────────

export function isTokenBased(category: 'image' | 'video' | 'audio' | 'text', modelName: string): boolean {
    const m = ModelRegistry.getByNameOrAlias(category, modelName);
    return !!(m?.pricing && (
        m.pricing.completionImageTokens !== undefined ||
        m.pricing.completionVideoTokens !== undefined ||
        m.pricing.completionAudioTokens !== undefined ||
        m.pricing.completionTextTokens !== undefined ||
        m.pricing.promptTextTokens !== undefined ||
        m.pricing.promptImageTokens !== undefined ||
        m.pricing.promptAudioTokens !== undefined
    ) && (m.pricing.completionVideoSeconds === undefined && m.pricing.completionAudioSeconds === undefined));
}

/**
 * Check if a generation should proceed based on cost control settings.
 * 
 * @param toolName - Name of the tool calling the check (e.g. 'polli_gen_video')
 * @param args - Original arguments passed to the tool
 * @param modelName - The model being used
 * @param estimatedCost - Estimated cost in Pollen
 * @param category - The model category ('image' | 'video' | 'audio')
 * @returns CostCheckResult
 */
export function checkCostControl(
    toolName: string,
    args: any,
    modelName: string,
    estimatedCost: number,
    category: 'image' | 'video' | 'audio' = 'image'
): CostCheckResult {
    const config = loadConfig();
    const enablePaid = config.enablePaidTools !== false; // default true
    const askConfirm = config.costConfirmationRequired === true; // default true
    const costLimit = config.costThreshold ?? 0.0;

    const m = ModelRegistry.getByNameOrAlias(category, modelName);

    // Détection token-based (si le modèle a une de ces propriétés de tarification, il est variable)
    const _isTokenBased = isTokenBased(category, modelName);

    const maxCost = _isTokenBased ? estimatedCost * 3 : estimatedCost;

    // ─── Bypass Check (For polli_gen_confirm) ────────────────
    if (args && (args as any)[Symbol.for('polli_confirmed')]) {
        return {
            allowed: true,
            message: _isTokenBased
                ? `💰 Coût validé (Max théorique: ${formatCost(maxCost)})`
                : `💰 Coût validé: ${formatCost(estimatedCost)}`
        };
    }

    // ─── Rule 1: Wallet Protection (Hard Block) ────
    if (!enablePaid) {
        if (m?.paid_only) {
            return {
                allowed: false,
                reason: 'paid_model_disabled',
                message: `❌ **Wallet Protégé**
Modèle: ${modelName} (payant)
enablePaidTools: désactivé
Résultat: REJETÉ, demandez à l'utilisateur d'activer le mode enablePaidTools via la commande pollinations appropriée si vous voulez utiliser ce modèle.`,
            };
        }
        // TODO: (Future) Add Check against FreeTier Quota empty API
    }

    // ─── Rule 2: Cost Confirmation (Suspend & Ticket) ─
    if (askConfirm && maxCost > costLimit) {
        const reqId = `req_${Math.random().toString(16).substring(2, 10)}`;
        savePendingRequest({
            id: reqId,
            toolName,
            args,
            estimatedCost: maxCost,
            model: modelName,
            timestamp: Date.now()
        });

        return {
            allowed: false, // NOT allowed to proceed automatically
            confirmationRequired: true,
            pendingRequestId: reqId,
            reason: 'cost_exceeds_limit',
            message: `⚠️ **Confirmation de Coût Requise**
${_isTokenBased
                    ? `Le coût estimé moyen est de ${formatCost(estimatedCost)} cependant ce modèle token-based peut vous coûter jusqu'à ${formatCost(maxCost)} ce qui dépasse le seuil défini (${formatCost(costLimit)}).`
                    : `Le coût estimé de cette action (${formatCost(estimatedCost)}) dépasse le seuil défini (${formatCost(costLimit)}).`
                }
💳 **Pour valider cette transaction et exécuter la requête**, 
Présentez le cout à l'utilisateur et demandez explicitement sa validation !!! 
(S'il valide, appelez l'outil \`polli_gen_confirm\` avec l'ID : \`${reqId}\` et l'action \`confirm\`. S'il refuse, appelez l'outil avec l'action \`cancel\` pour purger la requête).`,
        };
    }

    // ─── All checks passed ────────────────────────────────────────────────
    return {
        allowed: true,
        message: estimatedCost > 0
            ? (_isTokenBased
                ? `💰 Coût estimé moyen: ${formatCost(estimatedCost)} (Max: ${formatCost(maxCost)})`
                : `💰 Coût estimé: ${formatCost(estimatedCost)}`)
            : undefined,
    };
}
