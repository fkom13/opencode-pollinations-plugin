import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_KEY = "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK"; // Paid Key
const OUTPUT_DIR = path.join(__dirname, '../tests/generated_media');
const COMPLEX_DIR = path.join(OUTPUT_DIR, 'complex_workflows');

if (!fs.existsSync(COMPLEX_DIR)) fs.mkdirSync(COMPLEX_DIR, { recursive: true });

// Base Images (Flux - Paid - High Quality)
// We use the URL directly as Pollinations I2I accepts URLs.
const BASE_PROMPT_1 = "cyberpunk city, neon lights, detailed, 8k";
const BASE_PROMPT_2 = "cyberpunk city ruins, overgrown, detailed, 8k";
const BASE_IMAGE_1_URL = `https://image.pollinations.ai/prompt/${encodeURIComponent(BASE_PROMPT_1)}?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;
const BASE_IMAGE_2_URL = `https://image.pollinations.ai/prompt/${encodeURIComponent(BASE_PROMPT_2)}?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;

console.log("Using Base Image 1:", BASE_IMAGE_1_URL);

const MODELS = [
    // --- 1. BASE GENERATION (To verify Flux works & get local copy) ---
    {
        name: 'flux',
        type: 'image',
        desc: 'Flux Base Image 1 (Reference)',
        prompt: BASE_PROMPT_1,
        params: {}
    },

    // --- 2. AUDIO / MUSIC (Optimized: 10s) ---
    {
        name: 'elevenmusic',
        type: 'audio',
        desc: 'ElevenLabs Music (10s Instrumental)',
        prompt: "Epic orchestral soundtrack",
        params: { duration: 10, instrumental: true }
    },
    {
        name: 'openai-audio',
        type: 'openai_chat_audio',
        desc: 'OpenAI Audio (TTS via Chat)',
        prompt: "Hello, this is a test of the OpenAI Audio model on Pollinations.",
        params: { voice: 'alloy', format: 'mp3' }
    },

    // --- 3. VIDEO GENERATION (T2V) ---
    {
        name: 'grok-video',
        type: 'video',
        desc: 'Grok Video (5s)',
        params: { duration: 5, aspectRatio: '16:9' }
    },
    /* Wan - I2V Only (Disabled T2V)
    {
        name: 'wan',
        type: 'video',
        desc: 'Wan 2.6 T2V (5s + Audio)',
        paid: true,
        params: { duration: 5, aspectRatio: '16:9', audio: true }
    }, */
    {
        name: 'ltx-2',
        type: 'video',
        desc: 'LTX-2 Video (Standard)',
        paid: true,
        params: { duration: 5 } // Attempt duration if supported
    },

    // --- 4. IMAGE-TO-VIDEO (I2V) ---
    {
        name: 'veo',
        type: 'video',
        paid: true,
        desc: 'Veo I2V (4s + Audio)',
        baseImage: BASE_IMAGE_1_URL,
        params: { duration: 4, aspectRatio: '16:9', audio: true }
    },
    {
        name: 'seedance',
        type: 'i2v',
        desc: 'Seedance I2V (5s + Cinematic)',
        baseImage: BASE_IMAGE_1_URL,
        params: { duration: 5, aspectRatio: '21:9' }
    },
    {
        name: 'wan',
        type: 'i2v',
        desc: 'Wan 2.6 I2V (5s + Audio)',
        paid: true,
        baseImage: BASE_IMAGE_1_URL,
        params: { duration: 5, aspectRatio: '16:9', audio: true }
    },
    {
        name: 'veo',
        type: 'video_interp',
        paid: true,
        desc: 'Veo Interpolation (2 Images)',
        baseImages: [BASE_IMAGE_1_URL, BASE_IMAGE_2_URL],
        params: { duration: 4, aspectRatio: '16:9' }
    },

    // --- 5. IMAGE-TO-IMAGE (I2I - Full Coverage) ---
    // Modify the base image (e.g., "turn it into a watercolor painting")
    {
        name: 'klein',
        type: 'i2i',
        desc: 'Klein I2I (Flux.2 4B)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "watercolor painting of a cyberpunk city",
        params: {}
    },
    {
        name: 'klein-large',
        type: 'i2i',
        desc: 'Klein Large I2I (Flux.2 9B)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "oil painting of a cyberpunk city",
        params: {}
    },
    {
        name: 'kontext',
        type: 'i2i',
        paid: true,
        desc: 'Kontext I2I (Flux.1 In-Context)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "cyberpunk city with heavy rain and reflections", // Context modification
        params: {}
    },
    {
        name: 'seedream',
        type: 'i2i',
        paid: true,
        desc: 'SeeDream I2I (ByteDance)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "sketch style",
        params: {}
    },
    {
        name: 'seedream-pro',
        type: 'i2i',
        paid: true,
        desc: 'SeeDream Pro I2I (ByteDance 4K)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "futuristic 3d render style",
        params: {}
    },
    {
        name: 'nanobanana',
        type: 'i2i',
        paid: true,
        desc: 'NanoBanana I2I (Gemini 2.5)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "add a flying car in the foreground",
        params: {}
    },
    {
        name: 'nanobanana-pro',
        type: 'i2i',
        paid: true,
        desc: 'NanoBanana Pro I2I (Gemini 3)',
        baseImage: BASE_IMAGE_1_URL,
        prompt: "change time of day to sunset",
        params: {}
    }
];

async function download(url, dest, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const file = dest ? fs.createWriteStream(dest) : null;
        const headers = body ? {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Length': Buffer.byteLength(body)
        } : {};

        const options = {
            method: method,
            headers: headers
        };

        const req = https.request(url, options, (response) => {
            const respHeaders = response.headers;

            if (response.statusCode >= 400) {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    reject({
                        message: `HTTP ${response.statusCode}`,
                        body: data.substring(0, 500),
                        headers: respHeaders
                    });
                });
                return;
            }

            if (file) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve({ headers: respHeaders, size: file.bytesWritten });
                });
            } else {
                // Collect body for JSON parsing (OpenAI Audio)
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({ headers: respHeaders, body: data }));
            }
        });

        req.on('error', (err) => {
            if (file) fs.unlink(dest, () => { });
            reject({ message: err.message });
        });

        if (body) req.write(body);
        req.end();
    });
}

function buildUrl(modelConfig, apiKey) {
    const baseUrl = 'https://gen.pollinations.ai/image'; // Default
    if (modelConfig.type === 'audio') return `https://gen.pollinations.ai/audio/${encodeURIComponent(modelConfig.prompt)}?model=${modelConfig.name}&key=${apiKey}&duration=${modelConfig.params.duration || 10}&instrumental=${modelConfig.params.instrumental || false}`;

    // Construct Prompt
    let promptText = modelConfig.prompt || "A futuristic cyberpunk city";
    if (modelConfig.type === 'video_interp') promptText = "morph";

    // Handle I2I Prompts (Some models need prompt + image)
    if (modelConfig.type === 'i2i' && modelConfig.prompt) {
        promptText = modelConfig.prompt;
    }

    let url = `${baseUrl}/${encodeURIComponent(promptText)}?model=${modelConfig.name}`;

    // Add Dimensions (Image Only)
    if (modelConfig.type === 'image' || modelConfig.type === 'i2i') {
        url += `&width=1024&height=1024`;
    }

    // Add Seed for consistency
    url += `&seed=42`;

    url += `&key=${apiKey}`;

    for (const [key, value] of Object.entries(modelConfig.params)) {
        url += `&${key}=${value}`;
    }

    if (modelConfig.baseImage) {
        url += `&image=${encodeURIComponent(modelConfig.baseImage)}`;
    }
    if (modelConfig.baseImages) {
        modelConfig.baseImages.forEach(img => {
            url += `&image=${encodeURIComponent(img)}`;
        });
    }

    return url;
}

async function run() {
    console.log(`Using Key: ${API_KEY.substring(0, 5)}...`);
    console.log(`Saving to: ${COMPLEX_DIR}`);

    for (const model of MODELS) {
        if (model.type === 'openai_chat_audio') {
            const dest = path.join(COMPLEX_DIR, `openai_audio.mp3`);
            console.log(`\n🧪 Testing ${model.desc}...`);
            try {
                const payload = JSON.stringify({
                    model: "openai-audio",
                    modalities: ["text", "audio"],
                    audio: { voice: "alloy", format: "mp3" },
                    messages: [
                        { role: "user", content: "Is this working?" }
                    ]
                });

                const v1Url = "https://gen.pollinations.ai/v1/chat/completions";

                const result = await download(v1Url, null, 'POST', payload);
                const json = JSON.parse(result.body);

                if (json.choices && json.choices[0].message.audio) {
                    const audioBase64 = json.choices[0].message.audio.data;
                    fs.writeFileSync(dest, Buffer.from(audioBase64, 'base64'));
                    console.log(`✅ Success: ${dest} (Saved Audio)`);
                } else {
                    console.log("❌ Failed: No audio in response", JSON.stringify(json).substring(0, 200));
                }

            } catch (e) {
                console.error(`❌ Failed ${model.name}`, e);
            }
            continue;
        }

        const ext = (model.type.includes('video') || model.type === 'i2v' || model.type === 'video_interp') ? 'mp4' : (model.type === 'audio' ? 'mp3' : 'jpg');
        const filename = `${model.name}_${model.type}.${ext}`;
        const dest = path.join(COMPLEX_DIR, filename);
        const url = buildUrl(model, API_KEY);

        console.log(`\n🧪 Testing ${model.desc} (${model.name})...`);
        // console.log(`   URL: ${url}`); // Partial log for debug if needed

        try {
            const result = await download(url, dest);

            console.log(`✅ Success: ${filename}`);
            console.log(`   Size: ${(result.size / 1024).toFixed(1)} KB`);
            console.log(`   Type: ${result.headers['content-type']}`);

            const costImg = result.headers['x-usage-completion-image-tokens'];
            const costVid = result.headers['x-usage-completion-video-seconds'];

            if (costImg) console.log(`   Cost (Img): ${costImg} tokens`);
            if (costVid) console.log(`   Cost (Vid): ${costVid} seconds`);

        } catch (e) {
            console.error(`❌ Failed ${model.name}`);
            console.error(`   Error: ${e.message}`);
            if (e.body) console.error(`   Body: ${e.body}`);
        }
    }
}

run();
