
const https = require('https');

const API_KEY = 'sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK'; // User's key from logs
const MODEL = 'openai'; // Test standard first
const MODEL_NOVA = 'nova-fast'; // The one failing

function testCall(model, useHackHeaders, bodyOverride = null) {
    return new Promise((resolve) => {
        let dataFn = {
            model: model,
            messages: [{ role: 'user', content: 'hello' }], // changed to hello
            stream: false
        };
        if (bodyOverride) dataFn = { ...dataFn, ...bodyOverride };

        const data = JSON.stringify(dataFn);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };

        if (useHackHeaders) {
            headers['User-Agent'] = 'curl/8.5.0';
            headers['Accept'] = 'application/json, text/event-stream'; // Important
        }
        // ... unchanged ...

        console.log(`\n--- Testing ${model} (Hack Headers: ${useHackHeaders}) ---`);

        const req = https.request('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode !== 200) {
                    console.log(`Error Body: ${body.substring(0, 200)}...`);
                }
                resolve(res.statusCode);
            });
        });

        req.on('error', e => {
            console.log(`Error: ${e.message}`);
            resolve(500);
        });

        req.write(data);
        req.end();
    });
}

(async () => {
    // 1. Test OpenAI (Control)
    await testCall('openai', true);

    // 2. Test Gemini with Hacks (Suspected Failure)
    await testCall('gemini', true);

    // 4. Test Gemini + Tools + Config (Plugin Logic)
    const toolsBody = {
        tools: [{
            type: 'function',
            function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: {} } }
        }],
        tools_config: { google_search_retrieval: { disable: true } }
    };
    await testCall('gemini', true, toolsBody);

    // 5. Test Gemini + Tools WITHOUT Config (Hypothesis: Maybe config is the problem?)
    const toolsBodyNoConfig = {
        tools: [{
            type: 'function',
            function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: {} } }
        }]
        // omitted tools_config
    };
    await testCall('gemini', true, toolsBodyNoConfig);
})();
