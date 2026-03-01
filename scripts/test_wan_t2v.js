import https from 'https';

// Tester sur l'URL principale de gen.pollinations.ai
const url = 'https://gen.pollinations.ai/image/a%20spinning%20blue%20cube?model=wan&width=512&height=512';
const options = {
    headers: {
        'Authorization': 'Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H',
        'User-Agent': 'OpenCode-Test-Probe/1.0'
    }
};

https.get(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode !== 200) {
            console.log(`Body: ${data}`);
        } else {
            console.log(`Success! Data length: ${data.length}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
