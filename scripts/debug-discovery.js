
const https = require('https');

const API_KEY = "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK";
const URL = "https://gen.pollinations.ai/text/models";

const req = https.get(URL, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
}, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data.substring(0, 500)}...`);
    });
});

req.on('error', e => console.error(e));
