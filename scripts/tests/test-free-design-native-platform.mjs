#!/usr/bin/env node
// Real standalone free-tool execution in the plugin registry: no LLM/API key.
// All outputs use temporary, synthetic files; no network used except Mermaid.ink.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'pollinations-free-design-'));
const original={};
for(const k of ['HOME','USERPROFILE','APPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_STATE_HOME','OPENCODE_CONFIG','OPENCODE_CONFIG_DIR']){
 original[k]=process.env[k];
 if(k==='OPENCODE_CONFIG'||k==='OPENCODE_CONFIG_DIR') delete process.env[k];
 else process.env[k]=path.join(workspace,k.toLowerCase());
}
for(const k of ['HOME','USERPROFILE','APPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_STATE_HOME']){
 fs.mkdirSync(process.env[k],{recursive:true});
}
const out=path.join(workspace,'output');
fs.mkdirSync(out);
try {
 const {createToolRegistry}=await import('../../dist/tools/index.js');
 const tools=createToolRegistry();
 assert(tools.gen_palette&&tools.gen_qrcode&&tools.gen_diagram,'free design tools must be registered without Pollinations login');
 assert(!tools.polli_gen_3d&&!tools.polli_decision,'keyless must hide authenticated tools');
 console.log('FREE_REGISTRY_KEYLESS_OK',Object.keys(tools).length);
 const ctx={metadata:()=>{},sessionID:'synthetic-free-test',abort:new AbortController().signal};
 const checks=[
  {name:'gen_palette',args:{color:'#3366AA',scheme:'analogous',count:3,filename:'real_palette',output_path:out},file:'real_palette.svg',contains:'<svg'},
  {name:'gen_qrcode',args:{content:'https://example.com/qa',size:128,filename:'real_qr',output_path:out},file:'real_qr.png',contains:null},
  ...(process.env.TEST_EXTERNAL_FREE_TOOLS==='1' ? [
   {name:'gen_diagram',args:{code:'flowchart LR\n  A[Build] --> B[Verify]\n  B --> C[Done]',format:'svg',filename:'real_diagram',output_path:out},file:'real_diagram.svg',contains:'<svg'}
  ]:[])
 ];
 for(const c of checks){
  const response=String(await tools[c.name].execute(c.args,ctx));
  assert(!response.startsWith('❌'),c.name+' returned: '+response.slice(0,400));
  const f=path.join(out,c.file);
  assert(fs.existsSync(f),c.name+' output file absent');
  const data=fs.readFileSync(f);
  assert(data.length>80,c.name+' output empty');
  if(c.contains) assert(data.toString('utf8').includes(c.contains),c.name+' must contain a valid SVG');
  if(c.name==='gen_qrcode') assert(data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'PNG signature required');
  console.log('FREE_TOOL_ACTUAL_OUTPUT_OK',c.name,process.platform,data.length);
 }
 console.log('FREE_TOOL_DESIGN_PASS',process.platform,checks.length);
} finally {
 for(const [k,v] of Object.entries(original)){
  if(v===undefined)delete process.env[k]; else process.env[k]=v;
 }
 fs.rmSync(workspace,{recursive:true,force:true,maxRetries:4,retryDelay:200});
}
