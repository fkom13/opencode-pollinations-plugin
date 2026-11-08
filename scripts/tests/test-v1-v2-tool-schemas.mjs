#!/usr/bin/env node
// No-network schema adapter QA for every V1 tool and V2 tool transform.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as z4 from 'zod/v4';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'polli-tool-schema-'));
for(const [k,suffix] of Object.entries({HOME:'home',XDG_CONFIG_HOME:'config',XDG_DATA_HOME:'data',XDG_STATE_HOME:'state',XDG_CACHE_HOME:'cache'})){
 const target=path.join(temp,suffix);fs.mkdirSync(target,{recursive:true,mode:0o700});process.env[k]=target;
}
process.env.OPENCODE_CONFIG_DIR=path.join(temp,'config','opencode');
fs.mkdirSync(process.env.OPENCODE_CONFIG_DIR,{recursive:true,mode:0o700});
try{
 const {createToolRegistry}=await import('../../dist/tools/index.js');
 const {saveConfig}=await import('../../dist/server/config.js');
 const basic=createToolRegistry();
 assert.equal(Object.keys(basic).length,13);
 saveConfig({apiKey:'sk_fixture_only',mode:'manual'});
 const all=createToolRegistry();
 assert.equal(Object.keys(all).length,25);
 const errors=[];
 for(const [name,tool] of Object.entries(all)){
  try{
   assert.equal(typeof tool.execute,'function');
   assert.ok(typeof tool.description==='string' && tool.description.length>10);
   const schema=z4.toJSONSchema(z4.object(tool.args||{}));
   delete schema.$schema;
   assert.equal(schema.type,'object');
   assert.ok(schema.properties && typeof schema.properties==='object');
  }catch(e){errors.push(name+':'+String(e.message).slice(0,110));}
 }
 assert.deepEqual(errors,[]);
 console.log('TOOL_SCHEMAS_OK','KEYLESS',Object.keys(basic).length,'CONNECTED',Object.keys(all).length,'V2_VALID',Object.keys(all).length);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
