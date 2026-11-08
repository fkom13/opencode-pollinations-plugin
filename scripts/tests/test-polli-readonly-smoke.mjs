#!/usr/bin/env node
// Authenticated, non-billed QA for public info tools and negative safety paths.
import assert from 'node:assert/strict';
const home=process.env.XDG_CONFIG_HOME||'';
if(!home.includes('polli-v7-opencode2-20261107'))throw Error('Must use isolated v2 auth profile');
const {createToolRegistry}=await import('../../dist/tools/index.js');
const reg=createToolRegistry();
const ctx={metadata:()=>{},sessionID:'safe-tool-qa',abort:new AbortController().signal};
const cases=[
 ['polli_status',{info_type:'usage'},false],
 ['polli_config',{action:'view'},false],
 ['polli_quests',{filter:'available'},false],
 ['polli_gen_confirm',{request_id:'qa-nonexistent-20261107',action:'cancel'},true],
 ['polli_decision',{state:'test',questions_json:'NOT_JSON'},true],
 ['polli_agent',{agent:'qa-invented-nonexistent',task:'test'},true],
];
let passed=0;
for(const [name,args,expectedNegative] of cases) {
 try{
   assert.ok(reg[name],name+' not registered');
   const r=await reg[name].execute(args,ctx);
   const s=typeof r==='string'?r:JSON.stringify(r);
   assert.ok(s.length>=10,name+' empty response');
   assert.ok(!/\bsk_[A-Za-z0-9]{10,}/.test(s),name+' secret exposure');
   const ok=expectedNegative?true:!/^(❌|Error:)/.test(s);
   assert.ok(ok,name+' failed');
   passed++;
   console.log('READONLY_TOOL_PASS',name,'characters',s.length,'negative_path',expectedNegative);
 }catch(e){console.log('READONLY_TOOL_FAIL',name,String(e.message).slice(0,170));}
}
console.log('READONLY_TOOL_QA',JSON.stringify({passed,total:cases.length}));
if(passed!==cases.length)process.exitCode=2;
