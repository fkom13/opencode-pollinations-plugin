#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); process.exitCode = 1; }
}

console.log('\n🧪 v7 / OpenCode V2 Compatibility Contracts\n');
ok('package has OpenCode v2 dependency', () => assert(pkg.dependencies['@opencode/plugin']));
ok('package keeps OpenCode v1 dependency', () => assert(pkg.dependencies['@opencode-ai/plugin']));

const index = read('src/index.ts');
ok('dual export retains V1 server and V2 setup', () => assert(index.includes('server: PollinationsPlugin') && index.includes('...PollinationsV2')));

const setup = read('bin/setup.js');
ok('setup detects v-prefixed OpenCode v2 versions', () => assert(setup.includes('v?(\\d+)')));
const localV2Shim = read('dev/opencode-v2-local/index.js');
ok('OpenCode 2.0.19 local shim delegates only to dist/v2.js', () => assert(localV2Shim.includes("../../dist/v2.js")));

const config = read('src/server/config.ts');
ok('community models default enabled', () => assert(/communityModels:\s*\{\s*enabled:\s*true\s*\}/.test(config)));
ok('managed agents default enabled with dedicated budget', () => assert(/managedAgents:\s*\{\s*enabled:\s*true,\s*budget:\s*0\.60\s*\}/.test(config)));

const gen = read('src/server/generate-config.ts');
ok('chat requires tool calling', () => assert(gen.includes('if (m.tools !== true) return')));
ok('hosted agents remain selectable for V1 backwards compatibility', () => assert(
  !/if \(m\.agent === true \|\| Boolean\(m\.base_model\)\) return/.test(gen) &&
  gen.includes('const hostedAgentPrefix') && gen.includes("? '🤖 ' : ''")
));
ok('community toggle controls community chat exposure', () => assert(gen.includes('config.communityModels?.enabled === false')));

const fetcher = read('src/server/models/fetcher.ts');
ok('community/source metadata preserved', () => assert(fetcher.includes("source: (raw.community") && fetcher.includes('community: raw.community')));
ok('agent metadata preserved', () => assert(fetcher.includes('agent: raw.agent === true')));
ok('health and endpoints metadata preserved', () => assert(fetcher.includes('health: raw.health') && fetcher.includes('supported_endpoints: raw.supported_endpoints')));

const worker = read('src/server/models/worker.ts');
ok('slash heuristic for community removed', () => assert(!worker.includes("name.includes('/')")));

const commands = read('src/server/commands.ts');
ok('/poll config community command exists', () => assert(commands.includes("key === 'community'")));
ok('/poll agents command exists', () => assert(commands.includes("case 'agents'") && commands.includes('handleAgentsCommand')));
ok('managed-agent budget commands exist', () => assert(commands.includes("key === 'agents'") && commands.includes("key === 'agent_budget'")));

const toolsIndex = read('src/tools/index.ts');
ok('polli_agent is registered through shared tool registry', () => assert(toolsIndex.includes("tools['polli_agent'] = polliAgentTool")));

const agentTool = read('src/tools/pollinations/polli_agent.ts');
ok('managed-agent estimator uses Pollinations prompt-agent runtime bounds', () => assert(agentTool.includes('PROMPT_AGENT_MAX_STEPS = 8') && agentTool.includes('PROMPT_AGENT_MAX_TOOL_CALLS = 16')));
ok('managed-agent estimator forces unknown runtimes above budget', () => assert(agentTool.includes('budget * 1.25')));
ok('polli_agent uses dedicated budget as Cost Guard threshold', () => assert(agentTool.includes('costLimit: budget') && agentTool.includes('confirmationRequired: true') && agentTool.includes('estimatedIsMax: true')));

const v2 = read('src/v2.ts');

ok('device login and BYOK are both routed in v1/v2', () => assert(
  commands.includes("case 'login':") && commands.includes("case 'connect':") &&
  v2.includes("name: 'poll'") && toolsIndex.includes("polli_login")
));
ok('account key is validated before accepting pairing', () => assert(
  commands.includes("checkEndpoint('/account/key', key)") && commands.includes("json.valid === false")
));
ok('failed BYOK does not clear an existing valid key', () => assert(
  !commands.includes("saveConfig({ apiKey: undefined, mode: 'manual' })")
));
ok('device flow uses least privilege by default', () => assert(
  commands.includes("scope: 'profile usage'") && !commands.includes("scope: 'profile usage keys'")
));
ok('v2 refreshes model transforms on device and BYOK connection', () => assert(
  commands.includes('await notifyConnectionChange()') &&
  v2.includes('subscribeConnectionChange(async () =>') &&
  v2.includes('unsubscribeConnectionChange()') &&
  v2.includes('await ctx.provider.reload()') &&
  v2.includes('await ctx.model.reload()')
));
ok('v2 reloads gated tools after successful pairing', () => assert(
  v2.includes('currentTools = createToolRegistry()') &&
  v2.includes('await ctx.tool.reload()') &&
  v2.includes('Object.entries(currentTools)')
));
ok('v2 redacts manually typed keys in synthetic command metadata', () => assert(
  v2.includes("'/poll connect [REDACTED]'") && v2.includes('command: safeCommand')
));
ok('private credential files are written with 0600 mode', () => assert(
  config.includes('fs.chmodSync(CONFIG_FILE, 0o600)') && config.includes('fs.chmodSync(authFile, 0o600)')
));
ok('all six README and locales document current pairing and budget controls', () => {
  const langs = ['en','fr','de','es','it','zh'];
  for (const lang of langs) {
    const locale = JSON.parse(read('src/locales/' + lang + '.json'));
    const guide = read(lang === 'en' ? 'README.md' : 'README.' + lang + '.md');
    assert(locale.commands.login.prompt.includes('**Budget**'));
    assert(locale.commands.login.prompt.includes('**Usage**'));
    assert(!locale.commands.login.prompt.includes('**unlimited key**'));
    assert(guide.includes('/poll login') && guide.includes('/poll connect sk_'));
    assert(guide.includes('v1/v2') || guide.includes('v1 et v2') || guide.includes('v1 e v2') || guide.includes('v1/v2'));
  }
});
ok('v2 registers provider with transform API', () => assert(v2.includes('ctx.provider.transform')));
ok('v2 registers tools with transform API', () => assert(v2.includes('ctx.tool.transform')));
ok('v2 registers /poll through command transform', () => assert(v2.includes('ctx.command.transform') && v2.includes("name: 'poll'")));
ok('v2 /poll responds through synthetic session message', () => assert(v2.includes('ctx.session.synthetic')));
ok('v1 proxy never logs a raw BYOK command', () => {
  const proxy = read('src/server/proxy.ts');
  assert(proxy.includes('redactCommandOutput(text).substring(0, 50)'));
  assert(proxy.includes('[Command] Intercepting: ${redactCommandOutput(text)}'));
  assert(!proxy.includes('log(`[Command] Intercepting: ${text}`)'));
});
ok('device login browser avoids ESM require and shell injection', () => {
  assert(commands.includes("target.hostname !== 'enter.pollinations.ai'"));
  assert(commands.includes('const child = spawn(cmd, argv'));
  assert(commands.includes('shell: false'));
  assert(commands.includes("child.on('error'"));
});
ok('v2 long results page or persist instead of truncation', () => assert(v2.includes('paginateCommandOutput(safeText)') && v2.includes('persistCommandReport(safeText, safeCommand)') && !v2.includes('visible.slice(0, 797)')));
ok('pricing command runs safely under ESM without shell', () => assert(commands.includes('promisify(execFile)') && commands.includes("new URL('./scripts/pollinations_pricing.js', import.meta.url)") && !commands.includes("require('child_process')")));
ok('v2 /poll displays the real command result, not a generic label', () => assert(
  v2.includes('description,') && v2.includes('safeText') &&
  !v2.includes("description: 'Pollinations command'")
));
ok('/poll status alias routes to localized usage', () => assert(
  commands.includes("case 'status':") && commands.includes('return await handleUsageCommand(args)')
));
ok('v2 forwards legacy metadata to tool progress', () => assert(v2.includes('await toolContext.progress(metadata)')));
ok('v2 cleanup closes proxy and worker', () => assert(v2.includes('ToolRegistryWorker.stop()') && v2.includes('proxy.close()')));

const costGuard = read('src/tools/pollinations/cost-guard.ts');
ok('cost guard pending store follows isolated Pollinations config dir', () => assert(costGuard.includes("path.join(CONFIG_DIR, 'pending_requests.json')")));
ok('cost guard supports text models natively', () => assert(costGuard.includes("'audio' | 'text' | '3d'")));

const confirm = read('src/tools/pollinations/polli_gen_confirm.ts');
ok('confirmation dispatcher resolves tools from shared registry', () => assert(confirm.includes("import('../index.js')") && confirm.includes('createToolRegistry()[pendingReq.toolName]')));
ok('confirmation dispatcher is not hard-coded to paid tool names', () => assert(!confirm.includes("'polli_gen_image':") && !confirm.includes("'polli_gen_3d':")));

const stt = read('src/tools/pollinations/transcribe_audio.ts');
ok('STT is protected by shared Cost Guard', () => assert(stt.includes("checkCostControl('polli_stt'")));
ok('STT estimates live per-second audio pricing', () => assert(stt.includes('promptAudioSeconds') && stt.includes('probeAudioDurationSeconds')));

const webSearch = read('src/tools/pollinations/polli_web_search.ts');
ok('web search uses text Cost Guard category', () => assert(webSearch.includes("checkCostControl('polli_web_search', args, model, estimatedCost, 'text')")));

if (!process.exitCode) console.log(`\n📊 v7 contracts: ${passed} passed, 0 failed\n`);
