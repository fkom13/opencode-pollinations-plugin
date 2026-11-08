#!/usr/bin/env node
// Offline regression: V1 reasoning variants and V2 explicit capability.
import assert from 'node:assert/strict';
import {Provider} from '@opencode/plugin';
import {mapV2Model} from '../../dist/v2.js';
const provider=Provider.ID.make('pollinations');
const raw={
 id:'enter/openai/gpt-6-sol', name:'GPT-6 Sol',
 tool_call:true,reasoning:true,
 variants:{low:{reasoningEffort:'low'},high:{reasoningEffort:'high'}},
 modalities:{input:['text','image'],output:['text']},
 limit:{context:200000,output:8000},
 interleaved:{field:'reasoning_content'}
};
const mapped=mapV2Model(raw,provider);
assert.equal(mapped.capabilities.reasoning.supported,true);
assert.deepEqual(mapped.capabilities.reasoning.effort,['low','high']);
assert.equal(mapped.capabilities.tools,true);
assert.deepEqual(mapped.capabilities.input,['text','image']);
assert.equal(mapped.compatibility.reasoningField,'reasoning_content');
assert.equal(mapped.variants.length,2);
assert.deepEqual(mapped.variants.map(x=>x.settings.reasoningEffort),['low','high']);
const no=mapV2Model({id:'free/basic',name:'Basic',reasoning:false,tool_call:false},provider);
assert.equal(no.capabilities.reasoning.supported,false);
assert.equal(no.capabilities.tools,false);
console.log('REASONING_V1_V2_CONTRACT_OK',2,'models, effort variants, streamed reasoning field, tools and modalities');
