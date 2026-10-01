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
ok('managed agents excluded from primary chat catalog', () => assert(gen.includes('if (m.agent === true) return')));
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
ok('v2 registers provider with transform API', () => assert(v2.includes('ctx.provider.transform')));
ok('v2 registers tools with transform API', () => assert(v2.includes('ctx.tool.transform')));
ok('v2 registers /poll through command transform', () => assert(v2.includes('ctx.command.transform') && v2.includes("name: 'poll'")));
ok('v2 /poll responds through synthetic session message', () => assert(v2.includes('ctx.session.synthetic')));
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
