import * as https from 'https';

export interface ApiClientConfig {
    apiKey?: string;
    baseUrl: string;
}

export abstract class BaseClient {
    protected config: ApiClientConfig;

    constructor(config: ApiClientConfig) {
        this.config = config;
    }

    abstract getHeaders(): Record<string, string>;

    // Helper used by the proxy to inject specific requirements
    abstract transformRequest(body: any, modelOriginalId: string): any;

    getBaseUrl(): string {
        return this.config.baseUrl;
    }
}

export class EnterpriseClient extends BaseClient {
    constructor(apiKey: string) {
        super({
            apiKey,
            baseUrl: "https://gen.pollinations.ai"
        });
    }

    getHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    transformRequest(body: any, modelOriginalId: string): any {
        // Enterprise uses OpenAI-compatible format mostly
        const newBody = { ...body };
        newBody.model = modelOriginalId; // Strip the namespace

        // Ensure stream is boolean if present (some clients send "true" string)
        if (newBody.stream === "true") newBody.stream = true;

        return newBody;
    }
}

export class FreeClient extends BaseClient {
    constructor() {
        super({
            baseUrl: "https://text.pollinations.ai"
        });
    }

    getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json'
        };
    }

    transformRequest(body: any, modelOriginalId: string): any {
        const newBody = { ...body };
        newBody.model = modelOriginalId;

        // Free Legacy sometimes needs specific params or cleanup
        // For now, standard passthrough with ID correction
        return newBody;
    }
}
