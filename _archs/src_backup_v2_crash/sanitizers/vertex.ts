
// Helper to dereference schemas for Vertex
function dereferenceSchema(schema: any, rootDefs: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    // Handle $ref
    if (schema.$ref || schema.ref) {
        const refKey = (schema.$ref || schema.ref).split('/').pop();
        if (rootDefs && rootDefs[refKey]) {
            const def = dereferenceSchema(JSON.parse(JSON.stringify(rootDefs[refKey])), rootDefs);
            delete schema.$ref;
            delete schema.ref;
            Object.assign(schema, def);
        } else {
            // Fallback: Clear/Stringify
            for (const key in schema) {
                if (key !== 'description' && key !== 'default') delete schema[key];
            }
            schema.type = "string";
            schema.description = (schema.description || "") + " [Ref Failed]";
        }
    }

    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = dereferenceSchema(schema.properties[key], rootDefs);
        }
    }
    if (schema.items) {
        schema.items = dereferenceSchema(schema.items, rootDefs);
    }

    if (schema.optional !== undefined) delete schema.optional;
    if (schema.title) delete schema.title;

    return schema;
}

export function sanitizeToolsForVertex(tools: any[]): any[] {
    return tools.map(tool => {
        if (!tool.function || !tool.function.parameters) return tool;
        let params = tool.function.parameters;
        const defs = params.definitions || params.$defs;
        params = dereferenceSchema(params, defs);
        if (params.definitions) delete params.definitions;
        if (params.$defs) delete params.$defs;
        tool.function.parameters = params;
        return tool;
    });
}

export function injectGeminiSignatures(body: any, lastSignature: string | null) {
    if (body.messages) {
        // 1. Loop through ALL Assistant Messages to inject signature
        body.messages.forEach((m: any) => {
            if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
                if (lastSignature) {
                    m.tool_calls.forEach((tc: any) => {
                        if (!tc.thought_signature) tc.thought_signature = lastSignature;
                        if (tc.function && !tc.function.thought_signature) tc.function.thought_signature = lastSignature;
                    });
                    if (!m.thought_signature) m.thought_signature = lastSignature;
                    if (!(m as any).thoughtSignature) (m as any).thoughtSignature = lastSignature;
                }
            }
        });

        // 2. ID Fix for Tool Response (Match last assistant tool call ID)
        const lastMsg = body.messages[body.messages.length - 1];
        if (lastMsg.role === 'tool') {
            let targetAssistantMsg: any = null;
            // Find generating assistant message
            for (let i = body.messages.length - 2; i >= 0; i--) {
                const m = body.messages[i];
                if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
                    targetAssistantMsg = m;
                    break;
                }
            }

            if (targetAssistantMsg) {
                const originalId = targetAssistantMsg.tool_calls[0].id;
                if (lastMsg.tool_call_id !== originalId) {
                    lastMsg.tool_call_id = originalId;
                }
                if (lastMsg.name && !lastMsg.tool_call_id) {
                    lastMsg.tool_call_id = originalId;
                }
            }
        }
    }
}
