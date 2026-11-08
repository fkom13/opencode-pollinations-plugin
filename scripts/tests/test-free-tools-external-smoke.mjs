#!/usr/bin/env node
// Live free third-party smoke with synthetic PNG input only. No Pollinations key.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const name=process.argv[2];
const root=fs.mkdtempSync('/tmp/polli-v7-free-external-');
for(const [env,dir] of [['HOME','home'],['XDG_CONFIG_HOME','config'],['XDG_DATA_HOME','data'],['XDG_STATE_HOME','state']]) {
  const dest=path.join(root,dir);fs.mkdirSync(dest,{recursive:true,mode:0o700});process.env[env]=dest;
}
const out=path.join(root,'outputs');fs.mkdirSync(out,{mode:0o700});
const {createToolRegistry}=await import('../../dist/tools/index.js');
const t=createToolRegistry();
const ctx={metadata:()=>{},sessionID:'free-external-smoke',abort:new AbortController().signal};
async function fixture() {
  const r=await t.gen_qrcode.execute({content:'OpenCode Pollinations v7 synthetic free QA',size:256,output_path:out,filename:'test_fixture'},ctx);
  if(String(r).startsWith('❌'))throw Error('Fixture generation failed');
  return path.join(out,'test_fixture.png');
}
let code=0,detail='';
try {
  const input=await fixture();
  const cases={
    gen_diagram:{code:'graph LR; A[Start] --> B[End]',format:'svg',output_path:out,filename:'network_diagram'},
    file_to_url:{file_path:input,expiry:'1h'},
    remove_background:{image_path:input,output_path:out,filename:'background_test',provider:'auto'},
    object_remover:{file:input,prompt:'remove the small central black markings',save_to:out,filename:'object_test'},
    image_upscaler:{file:input,ratio:'2',save_to:out,filename:'upscaled_test'},
    image_enhancer:{file:input,target_longest_side:'1024',save_to:out,filename:'enhanced_test'},
    gen_edit_image_free:{prompt:'a simple blue square centered on white',width:256,height:256,aspect_ratio:'1:1',save_to:out,filename:'playground_test'},
    polli_status:{info_type:'models'},
  };
  if(!(name in cases))throw Error('Unknown test case');
  const start=Date.now();
  const result=await t[name].execute(cases[name],ctx);
  const text=typeof result==='string'?result:JSON.stringify(result);
  const files=fs.readdirSync(out).filter(f=>f!=='test_fixture.png');
  const hasError=/^(❌|Error\b|Failed\b)/i.test(text.trim()) || (/erreur|error|failed|timeout|not available/i.test(text.slice(0,100)) && !/success/i.test(text.slice(0,100)));
  const ok=!hasError && text.length>10 && (files.length>0 || name==='file_to_url' || name==='polli_status');
  detail=JSON.stringify({name,status:ok?'PASS':'FAIL',ms:Date.now()-start,files:files.map(f=>({extension:path.extname(f),bytes:fs.statSync(path.join(out,f)).size})),response_chars:text.length,hasError,preview:ok?'':text.slice(0,165)});
  code=ok?0:1;
}catch(e){
 code=2;detail=JSON.stringify({name,status:'THREW',error:String(e.message).slice(0,185)});
}finally{
 console.log('FREE_EXTERNAL_SMOKE',detail);
 fs.rmSync(root,{recursive:true,force:true});
}
process.exitCode=code;
