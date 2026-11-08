#!/usr/bin/env node
/**
 * Real OpenCode 2.2.5 process + v7 plugin + actual /poll help native command.
 * No user keys, no model API calls, no token charges, no fake successful tools.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';

const bin=process.env.TEST_NATIVE_BIN || path.join(process.env.RUNNER_TEMP || '', 'native-opencode', 'node_modules', '@opencode', 'cli', 'bin', 'opencode.exe');
assert(bin,'TEST_NATIVE_BIN required (the actual OpenCode binary)');
const home=mkdtempSync(path.join(os.tmpdir(),'polli-real-v2-'));
const root=process.cwd();
for(const d of ['home','appdata','config','data','state','cache'])
  mkdirSync(path.join(home,d),{recursive:true});
const configDir=path.join(home,'config');
const configFile=path.join(configDir,'opencode.json');
writeFileSync(configFile,JSON.stringify({$schema:'https://opencode.ai/config.json',plugins:[root]}));
const listener=net.createServer();
const port=await new Promise((res,rej)=>{
 listener.once('error',rej);
 listener.listen(0,'127.0.0.1',()=>{
  const port=listener.address().port;
  listener.close(()=>res(port));
 });
});
const env={...process.env,
 HOME:path.join(home,'home'),USERPROFILE:path.join(home,'home'),
 APPDATA:path.join(home,'appdata'),XDG_CONFIG_HOME:configDir,
 XDG_DATA_HOME:path.join(home,'data'),XDG_STATE_HOME:path.join(home,'state'),
 XDG_CACHE_HOME:path.join(home,'cache'),OPENCODE_CONFIG:configFile,
 OPENCODE_CONFIG_DIR:configDir,OPENCODE_SERVER_PASSWORD:'fixture-local-only',
 OPENCODE_DISABLE_AUTOUPDATE:'true'};
const srv=spawn(bin,['serve','--hostname','127.0.0.1','--port',String(port)],{
 cwd:home,env,stdio:['ignore','pipe','pipe'],windowsHide:true
});
let stdout='',stderr='';
srv.stdout.on('data',d=>{stdout=(stdout+d).slice(-3500)});
srv.stderr.on('data',d=>{stderr=(stderr+d).slice(-4500)});
const headers={'Authorization':'Basic '+Buffer.from('opencode:fixture-local-only').toString('base64'),'Content-Type':'application/json'};
const base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(method,url,body,timeout=14000){
 const resp=await fetch(base+url,{method,headers,
 body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 let data=await resp.text();
 try{data=JSON.parse(data)}catch{data=data.slice(0,400)}
 return {status:resp.status,data};
}
try {
 let registered=false;
 for(let n=0;n<95;n++){
  if(srv.exitCode!==null)throw Error('OpenCode exited: '+srv.exitCode+' '+stderr.slice(-900));
  try{
   const a=await call('GET','/api/plugin',undefined,2200);
   const b=await call('GET','/api/provider',undefined,2200);
   if(a.status===200 && b.status===200 &&
    a.data.data?.some(p=>p.id==='pollinations'&&p.state?.status==='active') &&
    b.data.data?.some(p=>p.id==='pollinations')){
      registered=true;break;
   }
  }catch{}
  await sleep(320);
 }
 assert(registered,'Real v2 host must load and activate Pollinations provider; '+stderr.slice(-800));
 console.log('NATIVE_PLUGIN_ACTIVATED_OK',os.platform(),os.arch());
 const commands=await call('GET','/api/command');
 assert.equal(commands.status,200);
 assert(commands.data.data?.some(c=>c.name==='poll'),'/poll native slash command was not registered');
 console.log('NATIVE_COMMAND_REGISTERED_OK');
 const created=await call('POST','/api/session',{title:'Isolated Pollinations native CLI command audit'});
 assert.equal(created.status,200);
 const sid=created.data.data?.id;
 assert(/^ses_/.test(sid), 'real OpenCode session missing');
 const run=await call('POST','/api/session/'+sid+'/command',{name:'poll',text:'help'},24000);
 assert.equal(run.status,204,'native /poll help command did not execute');
 console.log('NATIVE_COMMAND_EXECUTED_OK');
 // synthetic messages are persisted asynchronously by the native command host
 let trace='';
 for(let i=0;i<18;i++){
  const messages=await call('GET','/api/session/'+sid+'/message',undefined,6000);
  trace=JSON.stringify(messages.data);
  if(/pollinations/i.test(trace) && /help/i.test(trace))break;
  await sleep(200);
 }
 // OpenCode V2 may deliver ctx.session.synthetic via UI events rather than
 // durable session messages. Never misreport a 204 as persisted output.
 const stored=/pollinations/i.test(trace) && /help/i.test(trace);
 console.log('NATIVE_COMMAND_HISTORY_PERSISTED',stored,'TRACE_BYTES',trace.length);
 console.log('NATIVE_HOST_SMOKE_PASS',os.platform());
} finally {
 srv.kill('SIGTERM');
 await sleep(650);
 if(srv.exitCode===null)srv.kill('SIGKILL');
 rmSync(home,{recursive:true,force:true,maxRetries:3,retryDelay:200});
 if(process.exitCode)console.error('SERVER_STDERR',stderr.slice(-1200));
}
