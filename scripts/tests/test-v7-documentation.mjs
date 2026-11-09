#!/usr/bin/env node
// Prevent major plugin capabilities from disappearing from the published README.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const langs=['README.md','README.fr.md','README.es.md','README.de.md','README.it.md','README.zh.md'];
const expected=[
 'polli_decision','polli_config','questions_json','state','allow_paid','choice','score','noul',
 'polli_gen_confirm','communityModelsEnabled','managedAgentsEnabled','agentBudget',
 'timeouts_json','resetTimeouts',
 '/poll agents [search]','/poll config community on|off','/poll config agents on|off',
 '/poll config agent_budget 0.60','/poll config enablePaidTools false',
 '/poll config costConfirmationRequired true','/poll config costThreshold 0.15',
 '/poll config timeouts.default 300','/poll config timeouts.video 1800',
 '/poll config timeouts.reset','/poll mode quest|quest_only|paid|manual'
];
for(const file of langs){
 const s=read(file);
 for(const key of expected)
  assert(s.includes(key),file+' missing documentation of '+key);
 assert(s.indexOf('polli_decision')!==s.lastIndexOf('polli_decision'),file+' needs both release highlights and tool details');
 assert(!s.includes('§'),file+' contains template marker');
 console.log('V7_DOC_PARITY_OK',file,expected.length,'features');
}
const manual=read('TECHNICAL_MANUAL.md');
for(const key of [...expected,'enableDeveloperTools','thresholdsQuest','thresholdsWallet','lang','statusBar','costEstimator','costConfirmationRequired'])
 assert(manual.includes(key),'Technical manual missing '+key);
assert(read('CHANGELOG.md').includes('## [7.0.1]'),'patch release changelog is required');
console.log('V7_DOC_MATRIX_COMPLETE',langs.length,'locales');
