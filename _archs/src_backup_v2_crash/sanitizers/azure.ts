export function sanitizeAzureTools(body: any, modelName: string) {
    // AZURE/OPENAI FIX: Strict ID Length for Tool Calls in Messages
    // Pollinations often routes OpenAI models to Azure backends, which enforce a strict 40-char ID limit.
    if ((modelName.includes("azure") || modelName.includes("openai") || modelName.includes("gpt")) && body.messages) {
        body.messages.forEach((m: any) => {
            if (m.tool_calls) {
                m.tool_calls.forEach((tc: any) => {
                    if (tc.id && tc.id.length > 40) {
                        tc.id = tc.id.substring(0, 40);
                    }
                });
            }
            if (m.role === 'tool' && m.tool_call_id && m.tool_call_id.length > 40) {
                m.tool_call_id = m.tool_call_id.substring(0, 40);
            }
        });
    }

    // General truncate tools definition if needed (Standard OpenAI/Azure limit often higher but good practice)
    if (body.tools && (modelName.includes("gpt") || modelName.includes("openai") || modelName.includes("azure"))) {
        // Simple truncation wrapper if defined or logic from original file
        // Re-implementing truncateTools equivalent locally if needed or import
        if (body.tools.length > 120) {
            body.tools = body.tools.slice(0, 120);
        }
    }
}
