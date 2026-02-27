const crypto = require('crypto');
const timestamp = "1740614000000";
const secret = "super_secret_community_key_2026";
const payload = `request-rembg-v1:${timestamp}`;
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(`JS sig: ${sig}`);
