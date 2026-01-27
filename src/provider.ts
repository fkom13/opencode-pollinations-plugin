
// Removed invalid imports
import * as fs from 'fs';

// --- Sanitization Helpers (Ported from Gateway/Upstream) ---

function safeId(id: string): string {
    if (!id) return id;
    if (id.length > 30) return id.substring(0, 30);
    return id;
}

function logDebug(message: string, data?: any) {
    try {
        const timestamp = new Date().toISOString();
        let logMsg = `[${timestamp}] ${message}`;
        if (data) {
            logMsg += `\n${JSON.stringify(data, null, 2)}`;
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', logMsg + '\n\n');
    } catch (e) {
        // ignore logging errors
    }
}

function sanitizeTools(tools: any[]): any[] {
    if (!Array.isArray(tools)) return tools;

    const cleanSchema = (schema: any) => {
        if (!schema || typeof schema !== "object") return;
        if (schema.optional !== undefined) delete schema.optional;
        if (schema.ref !== undefined) delete schema.ref;
        if (schema["$ref"] !== undefined) delete schema["$ref"];

        if (schema.properties) {
            for (const key in schema.properties) cleanSchema(schema.properties[key]);
        }
        if (schema.items) cleanSchema(schema.items);
    };

    return tools.map((tool) => {
        const newTool = { ...tool };
        if (newTool.function && newTool.function.parameters) {
            cleanSchema(newTool.function.parameters);
        }
        return newTool;
    });
}

function filterTools(tools: any[], maxCount = 120): any[] {
    if (!Array.isArray(tools)) return [];
    if (tools.length <= maxCount) return tools;

    const priorities = [
        "bash", "read", "write", "edit", "webfetch", "glob", "grep",
        "searxng_remote_search", "deepsearch_deep_search", "google_search",
        "task", "todowrite"
    ];

    const priorityTools = tools.filter((t) => priorities.includes(t.function.name));
    const otherTools = tools.filter((t) => !priorities.includes(t.function.name));

    const slotsLeft = maxCount - priorityTools.length;
    const othersKept = otherTools.slice(0, Math.max(0, slotsLeft));

    logDebug(`[POLLI-PLUGIN] Filtering tools: ${tools.length} -> ${priorityTools.length + othersKept.length}`);
    return [...priorityTools, ...othersKept];
}

// --- Fetch Implementation ---

export const createPollinationsFetch = (apiKey: string) => async (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> => {
    let url = input.toString();
    const options = init || {};
    let body: any = null;

    if (options.body && typeof options.body === "string") {
        try {
            body = JSON.parse(options.body);
        } catch (e) {
            // Not JSON, ignore
        }
    }

    // --- INTERCEPTION & SANITIZATION ---
    if (body) {
        let model = body.model || "";

        // 0. Model Name Normalization
        if (typeof model === "string" && model.startsWith("pollinations/enter/")) {
            body.model = model.replace("pollinations/enter/", "");
            model = body.model;
        }

        // FIX: Remove stream_options (causes 400 on some OpenAI proxies)
        if (body.stream_options) {
            delete body.stream_options;
        }

        // 1. Azure Tool Limit Fix
        if ((model.includes("openai") || model.includes("gpt")) && body.tools) {
            if (body.tools.length > 120) {
                body.tools = filterTools(body.tools, 120);
            }
        }

        // 2. Vertex/Gemini Schema Fix
        if (model.includes("gemini") && body.tools) {
            body.tools = sanitizeTools(body.tools);
        }

        // Re-serialize body
        options.body = JSON.stringify(body);
    }

    // Ensure Headers
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("Content-Type", "application/json");
    options.headers = headers;

    logDebug(`Req: ${url}`, body);

    try {
        const response = await global.fetch(url, options);

        // Log response status
        // We clone to read text for debugging errors
        if (!response.ok) {
            try {
                const clone = response.clone();
                const text = await clone.text();
                logDebug(`Res (Error): ${response.status}`, text);
            } catch (e) {
                logDebug(`Res (Error): ${response.status} (Read failed)`);
            }
        } else {
            logDebug(`Res (OK): ${response.status}`);
        }

        return response;
    } catch (e: any) {
        logDebug(`Fetch Error: ${e.message}`);
        throw e;
    }
};
