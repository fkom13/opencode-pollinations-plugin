
const https = require('https');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'curl/8.5.0' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function formatName(name, censored) {
    let clean = name.replace(/^pollinations\//, '').replace(/-/g, ' ');
    // capitalize words
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    if (!censored) clean += " (Uncensored)";
    return clean;
}

async function run() {
    console.log("Fetching Free Models...");
    try {
        const free = await fetchUrl('https://text.pollinations.ai/models');
        const models = Array.isArray(free) ? free : (free.data || []);

        console.log(`Found ${models.length} models.`);
        if (models.length > 0) {
            const m = models.find(x => x.name === 'bidara') || models[0];
            console.log("\nRAW SAMPLE (bidara or first):", JSON.stringify(m, null, 2));

            // Logic Simulation
            const id = m.name || m.id;
            const desc = m.description ? m.description : formatName(id, m.censored);
            const displayName = `Pollinations Free: ${desc}`;

            console.log("\nMAPPED RESULT:");
            console.log("ID:", `pollinations/free/${id}`);
            console.log("NAME:", displayName);
            console.log("DESC FIELD:", m.description);
        }
    } catch (e) {
        console.error(e);
    }
}

run();
