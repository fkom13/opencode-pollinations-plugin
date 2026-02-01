
import { createPollinationsFetch } from "./dist/provider.js";

// Mock global fetch
global.fetch = async (url, options) => {
    console.log("--- MOCK FETCH ---");
    console.log("URL:", url);
    console.log("Headers:", options.headers);
    console.log("Body:", options.body);
    return new Response("ok");
};

const run = async () => {
    const fetcher = createPollinationsFetch("dummy-key");

    // Simulate OpenCode request with problematic fields
    const inputBody = {
        model: "pollinations/enter/gemini",
        stream_options: { include_usage: true }, // Verify this gets deleted
        messages: [{ role: "user", content: "hello" }],
        tools: Array(150).fill({ function: { name: "tool", parameters: { type: "object", properties: { ref: { type: "string" } } } } })
    };

    console.log("Testing plugin fetch...");
    await fetcher("https://gen.pollinations.ai/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify(inputBody)
    });
};

run().catch(console.error);
