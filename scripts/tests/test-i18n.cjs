#!/usr/bin/env node
/**
 * i18n parity tests — 6 locales must share the same key tree as en.json
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../../src/locales');
const LANGS = ['en', 'fr', 'es', 'de', 'it', 'zh'];

function flatten(obj, prefix = '', out = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, key, out);
        } else {
            out[key] = v;
        }
    }
    return out;
}

function load(lang) {
    return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf-8'));
}

let failed = 0;
let passed = 0;
const assert = (cond, msg) => {
    if (cond) {
        passed++;
        console.log(`✓ ${msg}`);
    } else {
        failed++;
        console.error(`✗ ${msg}`);
    }
};

console.log('\n🌍 i18n Parity Tests\n');

const en = flatten(load('en'));
assert(Object.keys(en).length > 300, `en.json has enough keys (${Object.keys(en).length})`);

// Required content keys for free tools / onboarding alignment
const requiredSubstrings = {
    'commands.infos.features_free': ['object_remover', 'image_upscaler', 'image_enhancer', 'gen_edit_image_free', 'remove_background'],
    'connect_response.tools_intro': ['object_remover', 'image_upscaler', 'image_enhancer'],
    'commands.models.cats.image': [],
    'commands.models.cats.3d': [],
    'commands.models.cats.embedding': [],
    'commands.models.cats.realtime': [],
    'commands.models.enter_error': [],
};

for (const lang of LANGS) {
    const flat = flatten(load(lang));
    const missing = Object.keys(en).filter((k) => !(k in flat));
    const extra = Object.keys(flat).filter((k) => !(k in en));
    assert(missing.length === 0, `${lang}: no missing keys (miss=${missing.length}${missing[0] ? ' e.g. ' + missing[0] : ''})`);
    assert(extra.length === 0, `${lang}: no extra keys (extra=${extra.length}${extra[0] ? ' e.g. ' + extra[0] : ''})`);

    for (const [key, needles] of Object.entries(requiredSubstrings)) {
        assert(typeof flat[key] === 'string' && flat[key].length > 0, `${lang}: key present ${key}`);
        for (const n of needles) {
            assert(String(flat[key]).includes(n), `${lang}: ${key} mentions ${n}`);
        }
    }

    // No French leakage in non-FR locales for the free-tool tail
    if (lang !== 'fr') {
        const ff = String(flat['commands.infos.features_free'] || '');
        const frenchLeak = /Suppression d['’]objets|Agrandissement 2x|Amélioration IA d['’]image/.test(ff);
        assert(!frenchLeak, `${lang}: features_free has no French leak`);
    }
}

console.log(`\n📊 i18n: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
