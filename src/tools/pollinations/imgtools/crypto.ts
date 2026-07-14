// imgtools/crypto.ts — AES-GCM + PBKDF2 pour ruo/enhance
// Adapté depuis /home/fkomp/Bureau/oracle/dev-serveur/iamges-tools-api/modules/crypto.js

import * as crypto from 'crypto';

const PBKDF2 = { iterations: 10000, hash: 'sha256', keylen: 32 };
const AES_GCM = { ivLen: 12, tagLen: 16 };

export function deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), Buffer.from(salt, 'utf8'), PBKDF2.iterations, PBKDF2.keylen, PBKDF2.hash);
}

export function encrypt(data: Record<string, unknown>, key: Buffer): string {
    const iv = crypto.randomBytes(AES_GCM.ivLen);
    const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, tag]).toString('base64');
}

export function decrypt(encoded: string, key: Buffer): any {
    const buf = Buffer.from(encoded, 'base64');
    const iv = buf.subarray(0, 12);
    const ciphertext = buf.subarray(12, -16);
    const tag = buf.subarray(-16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
}

const _keyCache: Record<string, Buffer> = {};
export function getKey(salt: string): Buffer {
    if (_keyCache[salt]) return _keyCache[salt];
    const key = deriveKey('vH33r_2025_AES_GCM_S3cur3_K3y_9X7mP4qR8nT2wE5yU1oI6aS3dF7gH0jK9lZ', salt);
    _keyCache[salt] = key;
    return key;
}