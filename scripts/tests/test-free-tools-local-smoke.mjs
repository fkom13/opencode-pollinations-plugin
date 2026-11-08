#!/usr/bin/env node
// Deterministic, free actual-output QA. No external keys or paid model calls.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=fs.mkdtempSync('/tmp/polli-v7-local-free-qa-');
for(const [name,sub] of [['HOME','home'],['XDG_CONFIG_HOME','config'],['XDG_DATA_HOME','data'],['XDG_STATE_HOME','state']]){
  const d=path.join(root,sub);fs.mkdirSync(d,{recursive:true,mode:0o700});process.env[name]=d;
}
const out=path.join(root,'artifacts');fs.mkdirSync(out,{mode:0o700});
const {createToolRegistry}=await import('../../dist/tools/index.js');
const tools=createToolRegistry();
const ctx={metadata:()=>{},sessionID:'v7-smoke',abort:new AbortController().signal};
const results=[];
async function run(name,args,pattern) {
  const start=Date.now();
  try{
    const value=await tools[name].execute(args,ctx);
    const answer=typeof value==='string'?value:JSON.stringify(value);
    assert.ok(!answer.startsWith('❌')&&!answer.includes('Error:'),name+' returned error: '+answer.slice(0,180));
    const files=fs.readdirSync(out).filter(f=>pattern.test(f));
    assert.ok(files.some(f=>fs.statSync(path.join(out,f)).size>60),name+' did not write expected nonempty output');
    const result={name,status:'PASS',ms:Date.now()-start,output_files:files.map(f=>({name:f,bytes:fs.statSync(path.join(out,f)).size}))};
    results.push(result);console.log(JSON.stringify(result));
  }catch(e){
    results.push({name,status:'FAIL',error:String(e.message).slice(0,210)});console.log(JSON.stringify(results.at(-1)));
  }
}
try{
  await run('gen_qrcode',{content:'https://example.com/qa',size:128,filename:'smoke_qr',output_path:out},/^smoke_qr.*\.png$/);
  await run('gen_palette',{color:'#2188aa',scheme:'complementary',count:5,filename:'smoke_palette',output_path:out},/^smoke_palette.*\.svg$/);
  const video=path.join(out,'synthetic.avi');
  const ff=spawnSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x120:rate=5','-f','lavfi','-i','sine=frequency=440:duration=2','-t','2','-c:v','mpeg4','-c:a','pcm_s16le','-y',video],{encoding:'utf8',timeout:16000});
  assert.equal(ff.status,0,'fixture ffmpeg failed: '+ff.stderr.slice(0,160));
  assert.ok(fs.statSync(video).size>1000);
  await run('extract_frames',{source:video,at_time:'0.6',filename:'smoke_frame',output_path:out},/^smoke_frame.*\.(png|jpg|jpeg|webp)$/);
  await run('extract_audio',{source:video,format:'wav',filename:'smoke_audio',output_path:out},/^smoke_audio.*\.wav$/);
  const total=results.length,passed=results.filter(x=>x.status==='PASS').length;
  console.log('FREE_LOCAL_SMOKE',JSON.stringify({total,passed,failed:total-passed}));
  if(passed!==total)process.exitCode=1;
}finally{
  // Outputs are synthetic; retain for follow-up provider-free tests, no credentials.
  console.log('FREE_SYNTHETIC_ARTIFACT_DIR',out);
}
