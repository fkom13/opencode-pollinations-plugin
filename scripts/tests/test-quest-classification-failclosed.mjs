#!/usr/bin/env node
// Offline regression: an absent/corrupt paid-only catalog cannot debit Paid
// via the Quest-only model route. No credentials or live API calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'polli-v7-quest-guard-'));
for(const [key,p] of Object.entries({HOME:'home',XDG_CONFIG_HOME:'config',XDG_DATA_HOME:'data',XDG_CACHE_HOME:'cache',XDG_STATE_HOME:'state'})){
 const dest=path.join(root,p);fs.mkdirSync(dest,{recursive:true,mode:0o700});process.env[key]=dest;
}
const {saveConfig,getConfigDir}=await import('../../dist/server/config.js');
const {paidOnlyClassification,handleChatCompletion}=await import('../../dist/server/proxy.js');
const store=path.join(getConfigDir(),'pollinations-paid-models.json');
const model='anthropic/claude-haiku-5.5';
try {
 saveConfig({mode:'quest_only'});
 assert.equal(paidOnlyClassification(model),'unknown');
 const chunks=[];let status=0;
 const res={
  writeHead(code){status=code;return this;},setHeader(){},write(s){chunks.push(String(s));return true;},
  end(s){if(s)chunks.push(String(s));}
 };
 await handleChatCompletion({},res,JSON.stringify({
  model:'enter/'+model,stream:false,max_tokens:30,
  messages:[{role:'user',content:'test'}]
 }));
 assert.equal(status,200);
 const reply=JSON.parse(chunks.join(''));
 assert.match(reply.choices[0].message.content,/classification is unavailable/);
 assert.equal(reply.usage.total_tokens,0);
 fs.writeFileSync(store,'broken json',{mode:0o600});
 assert.equal(paidOnlyClassification(model),'unknown');
 fs.writeFileSync(store,JSON.stringify([model]),{mode:0o600});
 assert.equal(paidOnlyClassification(model),'paid');
 assert.equal(paidOnlyClassification('openai/gpt-6-sol'),'eligible');
 console.log('QUEST_ONLY_FAIL_CLOSED_OK','missing','corrupt','paid','eligible','zero upstream requests');
}finally {
 fs.rmSync(root,{recursive:true,force:true});
}
