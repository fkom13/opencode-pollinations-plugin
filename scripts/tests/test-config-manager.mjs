#!/usr/bin/env node
// Hermetic regression for polli_config; no live API calls or credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'polli-v7-config-manager-'));
const previous={};
for(const [key,dir] of Object.entries({
 HOME:'home', USERPROFILE:'home',APPDATA:'appdata',XDG_CONFIG_HOME:'config',
 XDG_DATA_HOME:'data',XDG_STATE_HOME:'state',XDG_CACHE_HOME:'cache',
 OPENCODE_CONFIG_DIR:'config/opencode',
})){
 previous[key]=process.env[key];
 process.env[key]=path.join(tmp,dir);
 fs.mkdirSync(process.env[key],{recursive:true});
}
try {
 const {polliConfigTool}=await import('../../dist/tools/pollinations/polli_config.js');
 const {loadConfig,saveConfig,CONFIG_FILE}=await import('../../dist/server/config.js');
 const ctx={metadata:()=>{}};
 const run=async(args)=>String(await polliConfigTool.execute(args,ctx));
 saveConfig({apiKey:'sk_qa_fabricated_not_real',statusBar:false});
 const visible=await run({action:'view'});
 assert(!visible.includes('sk_qa_fabricated_not_real'),'view must never disclose the full API key');
 assert(visible.includes('REDACTED'),'view must redact credentials');
 const good=await run({action:'update',
  communityModelsEnabled:false,managedAgentsEnabled:false,agentBudget:0.8,
  enablePaidTools:false,costConfirmationRequired:true,costThreshold:0.12,
  timeouts_json:JSON.stringify({default:270,capabilities:{video:1400},overrides:{'test-model':900}})});
 assert(!good.includes('Invalid'),good);
 let c=loadConfig();
 assert.equal(c.communityModels.enabled,false);
 assert.equal(c.managedAgents.enabled,false);
 assert.equal(c.managedAgents.budget,0.8);
 assert.equal(c.enablePaidTools,false);
 assert.equal(c.costConfirmationRequired,true);
 assert.equal(c.costThreshold,0.12);
 assert.equal(c.timeouts.default,270);
 assert.equal(c.timeouts.capabilities.video,1400);
 assert.equal(c.timeouts.overrides['test-model'],900);
 await run({action:'update',managedAgentsEnabled:true});
 c=loadConfig();
 assert.equal(c.managedAgents.enabled,true);
 assert.equal(c.managedAgents.budget,0.8,'enable toggle must keep the agent budget');
 assert.equal(c.communityModels.enabled,false,'agent updates must not overwrite community settings');
 const before=fs.readFileSync(CONFIG_FILE);
 assert((await run({action:'update',agentBudget:-1})).includes('Invalid agentBudget'));
 assert((await run({action:'update',agentBudget:1001})).includes('Invalid agentBudget'));
 assert((await run({action:'update',timeouts_json:'{"capabilities":{"unsafe":20}}'})).includes('Invalid timeouts_json'));
 assert((await run({action:'update',timeouts_json:'{"default":-5}'})).includes('Invalid timeouts_json'));
 assert((await run({action:'update',timeouts_json:'{"overrides":{"__proto__":400}}'})).includes('Invalid timeouts_json'));
 assert((await run({action:'update',timeouts_json:'not-json'})).includes('Invalid timeouts_json'));
 assert((await run({action:'update',resetTimeouts:true,timeouts_json:'{}'})).includes('not both'));
 assert.equal(Buffer.compare(before,fs.readFileSync(CONFIG_FILE)),0,'invalid input must not modify config');
 const reset=await run({action:'update',resetTimeouts:true});
 assert(!reset.includes('Invalid'),reset);
 assert.equal(loadConfig().timeouts,undefined,'timeout reset must restore defaults');
 if(process.platform!=='win32')
  assert.equal(fs.statSync(CONFIG_FILE).mode & 0o077,0,'POSIX credentials must stay chmod 0600');
 console.log('CONFIG_MANAGER_V7_PASS view, redaction, model/agent settings, guard, timeouts, invalid inputs and reset');
} finally {
 for(const [key,value] of Object.entries(previous)){
  if(value===undefined)delete process.env[key]; else process.env[key]=value;
 }
 fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:150});
}
