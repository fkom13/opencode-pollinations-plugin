const fs = require('fs');
const path = require('path');

const originalContent = fs.readFileSync('README.md', 'utf8');

const langs = [
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' }
];

async function translate() {
    for (const lang of langs) {
        console.log(`Translating to ${lang.name}...`);
        try {
            const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [
                        { role: 'system', content: `You are a professional technical translator. Translate the following GitHub README into ${lang.name}. Keep ALL markdown formatting, tables, HTML tags, image tags, badges, emojis, code blocks, and links completely intact. Only translate the human text.` },
                        { role: 'user', content: originalContent }
                    ],
                    temperature: 0.1
                })
            });
            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const translated = data.choices[0].message.content;
                fs.writeFileSync(`README.${lang.code}.md`, translated);
                console.log(`Saved README.${lang.code}.md`);
            } else {
                console.log(`Failed to translate ${lang.name}`, data);
            }
        } catch (e) {
            console.error(`Error for ${lang.name}:`, e.message);
        }
    }
}
translate();
