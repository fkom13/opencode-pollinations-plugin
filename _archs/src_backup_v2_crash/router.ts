
import { EnterpriseClient, FreeClient, BaseClient } from './clients.js';

export class PollinationsRouter {
    private freeClient: FreeClient;

    constructor() {
        this.freeClient = new FreeClient();
    }

    /**
     * Selects the appropriate client based on the model namespace and API Key availability.
     * Future: Will also handle Quota/Fallback logic.
     */
    getClient(modelName: string, apiKey?: string): { client: BaseClient, originalId: string, isFree: boolean } {
        // 1. Explicit Namespace Routing
        if (modelName.startsWith("pollinations/free/")) {
            return {
                client: this.freeClient,
                originalId: modelName.replace("pollinations/free/", ""),
                isFree: true
            };
        }

        if (modelName.startsWith("pollinations/enter/")) {
            const originalId = modelName.replace("pollinations/enter/", "");
            return {
                client: new EnterpriseClient(apiKey || ""),
                originalId: originalId,
                isFree: false
            };
        }

        // 2. Default / Legacy Routing (No namespace)
        // If we have an API Key, assume Enterprise intent
        if (apiKey) {
            return {
                client: new EnterpriseClient(apiKey),
                originalId: modelName, // Passthrough
                isFree: false
            };
        }

        // Fallback to Free if no key (though OpenCode might complain before reaching here if auth is strict)
        return {
            client: this.freeClient,
            originalId: modelName,
            isFree: true
        };
    }

    /**
     * Resolves the target URL for the selected client.
     */
    getTargetUrl(client: BaseClient, path: string): string {
        // Free API uses /openai/chat/completions specifically for compatibility
        if (client instanceof FreeClient && path.includes("/chat/completions")) {
            return `${client.getBaseUrl()}/openai/chat/completions`;
        }

        // Enterprise uses standard /v1/...
        return `${client.getBaseUrl()}${path.startsWith('/v1') ? path : '/v1' + path}`;
    }
}
