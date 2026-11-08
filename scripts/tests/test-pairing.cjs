#!/usr/bin/env node
// Offline regression: keyless OpenCode tools stay limited; a successful
// connection makes media, decision, and managed-agent tools available.
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '../..');
// The provider grants 30 minutes to complete device consent. Do not expire
// the OpenCode poller after 5 minutes while the authorization is still valid.
const commandsSource = require('node:fs').readFileSync(join(root, 'src/server/commands.ts'), 'utf8');
assert.match(commandsSource, /Math\.min\(expiresIn,\s*30\s*\*\s*60\s*\*\s*1000\)/,
  'device polling must honor the server-advertised lifetime up to 30 minutes');
const base = mkdtempSync(join(tmpdir(), 'polli-v7-pairing-qa-'));
try {
  const script = [
    'import fs from "node:fs";',
    'const root = process.cwd();',
    'const cfg = await import("file://" + root + "/dist/server/config.js");',
    'const mod = await import("file://" + root + "/dist/tools/index.js");',
    'const before = Object.keys(mod.createToolRegistry());',
    'cfg.saveConfig({apiKey:"sk_test_dummy_never_valid"});',
    'const after = Object.keys(mod.createToolRegistry());',
    'const configExists = fs.statSync(cfg.CONFIG_FILE).isFile();',
    '// chmod 0600 is POSIX-only; on Windows, NTFS access is governed by ACLs.',
    'const protectedConfig = process.platform === "win32" ? null : (fs.statSync(cfg.CONFIG_FILE).mode & 0o077) === 0;',
    'console.log(JSON.stringify({before,after,configExists,protectedConfig}));',
  ].join('\n');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    env: {
      ...process.env,
      HOME: base,
      USERPROFILE: base,
      APPDATA: join(base, 'appdata'),
      XDG_CONFIG_HOME: join(base, 'config'),
      XDG_DATA_HOME: join(base, 'data'),
      XDG_STATE_HOME: join(base, 'state'),
      XDG_CACHE_HOME: join(base, 'cache'),
    },
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.equal(child.status, 0, 'isolated process failed: ' + child.stderr.slice(0, 500));
  const result = JSON.parse(child.stdout.trim());
  assert(result.before.includes('polli_login'), 'keyless login tool must always be visible');
  assert(!result.before.includes('polli_decision'), 'keyless must not expose paid decision tool');
  assert(!result.before.includes('polli_gen_3d'), 'keyless must not expose paid 3d tool');
  for (const name of ['polli_login','polli_decision','polli_gen_3d','polli_agent']) {
    assert(result.after.includes(name), 'connected tool missing: ' + name);
  }
  assert(result.after.length > result.before.length, 'authenticated tool inventory should expand');
  assert(result.configExists, 'credential config must be created inside the isolated profile');
  if (process.platform === 'win32') {
    assert.equal(result.protectedConfig, null, 'Windows permissions must be audited via NTFS ACLs, not POSIX chmod bits');
    console.log('✓ Windows isolated config created (NTFS ACL permissions require separate verification)');
  } else {
    assert(result.protectedConfig, 'POSIX credential config must be chmod 0600');
    console.log('✓ POSIX credential config has chmod 0600');
  }
  console.log('✓ keyless tools: ' + result.before.length + ' / connected tools: ' + result.after.length);
  console.log('✓ gated Decision/3D/agent tools');
} finally {
  rmSync(base, { recursive: true, force: true });
}
