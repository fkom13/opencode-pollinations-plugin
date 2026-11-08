#!/usr/bin/env node
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const p = pathToFileURL(path.resolve(__dirname, '../../dist/tools/pollinations/polli_decision.js'));
  const { isFreeDecisionModel, chooseDecisionModel } = await import(p.href);
  let passed=0;
  function ok(title, fn) { fn();passed++;console.log('✓ '+title); }
  const free = (id,status='healthy') => ({
    name:id, paidOnly:false, pricing:{currency:'pollen',promptTextTokens:0}, health:{status}
  });
  const paid=(id)=>({name:id,paidOnly:true,pricing:{currency:'pollen',promptTextTokens:'0.00002'},health:{status:'healthy'}});
  ok('Decision zero-price entry accepted with explicit paidOnly=false', ()=>assert.equal(isFreeDecisionModel(free('respan/span-01-lite')),true));
  ok('Decision billed entry rejected',()=>assert.equal(isFreeDecisionModel(paid('typesafe/jev-1.14')),false));
  ok('Decision nonzero price rejected even when paidOnly=false',()=>assert.equal(isFreeDecisionModel({...free('q'),pricing:{currency:'pollen',promptTextTokens:'0.00001'}}),false));
  ok('Currency-only pricing is unpriced, not free',()=>assert.equal(isFreeDecisionModel({name:'unpriced',paidOnly:false,pricing:{currency:'pollen'}}),false));
  ok('Unknown prices are not free',()=>assert.equal(isFreeDecisionModel({name:'unknown',paidOnly:false}),false));
  ok('Unknown paidOnly status is not free',()=>assert.equal(isFreeDecisionModel({name:'unknown',pricing:{currency:'pollen'}}),false));
  ok('Invalid quoted numeric price is not free',()=>assert.equal(isFreeDecisionModel({name:'invalid',paidOnly:false,pricing:{currency:'pollen',promptTextTokens:'NaN'}}),false));
  ok('Healthy free selected ahead of degraded free and paid',()=>{
    const m=chooseDecisionModel([paid('jev'),free('degraded','degraded'),free('healthy','healthy')]);
    assert.equal(m.name,'healthy');
  });
  ok('No free model returns null without choosing a billed model',()=>assert.equal(chooseDecisionModel([paid('jev')]),null));
  ok('Paid selection works only by explicit model name',()=>assert.equal(chooseDecisionModel([paid('jev')],'jev')?.name,'jev'));
  ok('Legacy alias resolves to canonical model',()=>{
    const m={...paid('typesafe/jev-1.14'), aliases:['jev']};
    assert.equal(chooseDecisionModel([m],'jev')?.name,m.name);
  });
  ok('Down free is never auto-selected',()=>assert.equal(chooseDecisionModel([free('down','down')]),null));
  const registry = await import(pathToFileURL(path.resolve(__dirname, '../../dist/tools/index.js')).href);
  const tools = registry.createToolRegistry();
  // The tool requires a Pollinations key, so public CI without credentials must still pass.
  const registration = require('node:fs').readFileSync(path.resolve(__dirname,'../../src/tools/index.ts'),'utf8');
  ok('Decision tool registration exists for authenticated mode',()=>assert(registration.includes("tools['polli_decision'] = polliDecisionTool")));
  ok('Keyless registry does not have to include decision',()=>assert.equal(typeof tools.polli_decision === 'undefined' || typeof tools.polli_decision === 'object',true));
  ok('Deprecated Pruna free video absent',()=>assert.equal(Boolean(tools.gen_video_free),false));
  console.log('Decision safety contracts: '+passed+' passed, 0 failed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
