#!/usr/bin/env node
// Account-aware read-only smoke: run only with isolated XDG config.
const q=process.env.XDG_CONFIG_HOME||'';
if(!q.startsWith('/tmp/polli-v7-')) throw Error('Refusing non-isolated config');
const {handleCommand}=await import('../../dist/server/commands.js');
const {paginateCommandOutput}=await import('../../dist/server/command-display.js');
const commands=['help','mode','status','usage full','config','models text','models image','models video','models audio','models 3d','pricing','infos','quests','agents','fallback','not-a-command'];
let errors=0;
for(const name of commands){
 const started=Date.now();
 try{
  const r=await handleCommand('/poll '+name);
  const output=r.response||r.error||'';
  const pages=paginateCommandOutput(output,700);
  const ok=!!r.handled && !!output && !r.error && !pages.some(x=>/\bsk_[A-Za-z0-9]{12,}/.test(x));
  if(!ok)errors++;
  console.log(JSON.stringify({command:name,status:ok?'OK':'ERROR',characters:output.length,pages:pages.length,ms:Date.now()-started}));
 }catch(e){errors++;console.log(JSON.stringify({command:name,status:'THREW',type:e?.constructor?.name||'Error'}));}
}
console.log('LIVE_COMMAND_MATRIX',JSON.stringify({commands:commands.length,errors}));
process.exitCode=errors?1:0;
