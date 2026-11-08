#!/usr/bin/env node
// Real compiled V1 proxy SSE commands and V2 visible-output paging, no billed API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'polli-v7-command-parity-'));
const xdg={
  HOME:temp+'/home',
  XDG_CONFIG_HOME:temp+'/config',
  XDG_DATA_HOME:temp+'/data',
  XDG_CACHE_HOME:temp+'/cache',
  XDG_STATE_HOME:temp+'/state',
  OPENCODE_CONFIG_DIR:temp+'/config/opencode',
};
for(const dir of Object.values(xdg)) fs.mkdirSync(dir,{recursive:true,mode:0o700});
Object.assign(process.env,xdg);
const {handleCommand}=await import('../../dist/server/commands.js');
const {handleChatCompletion}=await import('../../dist/server/proxy.js');
const {saveConfig}=await import('../../dist/server/config.js');
const {paginateCommandOutput,toReadableCommandText,redactCommandOutput,persistCommandReport}=await import('../../dist/server/command-display.js');
const cmds=['help','config','mode','fallback','status'];
let sseChecked=0,translations=0,sections=0;
function runV1(command) {
  return new Promise(async(resolve,reject)=>{
    const chunks=[];
    let code=0;
    const res={
      writeHead(c){code=c;},
      write(c){chunks.push(String(c));},
      end(){resolve({code,frames:chunks.join('')});},
      setHeader(){},
    };
    try{
      await handleChatCompletion({} ,res,JSON.stringify({
        model:'pollinations/connect',
        stream:true,
        messages:[{role:'user',content:'/poll '+command}]
      }));
    } catch(err){reject(err);}
  });
}
function parseStream(text) {
  const frames=text.split('\n').filter(x=>x.startsWith('data: {')).map(x=>JSON.parse(x.slice(6)));
  assert.ok(text.includes('data: [DONE]'),'V1 SSE must terminate');
  return frames.map(x=>x.choices?.[0]?.delta?.content||'').join('');
}
try{
  for (const lang of ['en','fr','de','es','it','zh']) {
    saveConfig({lang});
    const help=await handleCommand('/poll help');
    assert.equal(help.handled,true);
    assert.ok(help.response && help.response.length > 900,lang+' help incomplete');
    const pages=paginateCommandOutput(help.response,650);
    assert.ok(pages.length>1,lang+' help should not be a clipped preview');
    assert.ok(pages.every(x=>x.length<=650),lang+' page too large');
    assert.ok(pages[0].length>30);
    assert.ok(pages.at(-1).trim().length>20);
    const transformed=toReadableCommandText(help.response);
    // No word may disappear, even for a long help response.
    const normalize=x=>x.replace(/\s+/g,' ').trim();
    assert.equal(normalize(pages.join('\n')),normalize(transformed),lang+' help was truncated');
    translations++;sections+=pages.length;
    if(lang==='fr') {
      for(const c of cmds) {
        const parsed=await handleCommand('/poll '+c);
        const sse=await runV1(c);
        assert.equal(sse.code,200,'V1 proxy response HTTP 200 '+c);
        assert.equal(parseStream(sse.frames),parsed.response || parsed.error,'V1 SSE parity '+c);
        sseChecked++;
      }
    }
  }
  const sample='OpenCode '+ 'A '.repeat(1100)+'TAIL_OK';
  const parts=paginateCommandOutput(sample,600);
  assert.ok(parts.length>=3);
  assert.ok(parts.at(-1).includes('TAIL_OK'));
  const key='sk_testing_not_real_123456';
  const secretOutput=redactCommandOutput('Key '+key+' Authorization: Bearer '+key);
  assert.ok(!secretOutput.includes(key));
  const report=persistCommandReport('Private key: '+key+'\nEND_MARKER', '/poll models text');
  assert.ok(fs.statSync(report).isFile(), 'command report must exist');
  // POSIX chmod bits are not meaningful for Windows NTFS ACL security.
  // Do not label an ACL unverified by this test as a verified 0600 file.
  if (process.platform !== 'win32')
    assert.equal(fs.statSync(report).mode & 0o077, 0, 'POSIX report must be private 0600');
  const saved=fs.readFileSync(report,'utf8');
  assert.ok(!saved.includes(key) && saved.includes('END_MARKER'));
  const relReport = path.relative(path.join(temp, 'state'), report);
  assert.ok(relReport && relReport !== '..' && !relReport.startsWith('..' + path.sep) && !path.isAbsolute(relReport),
    'report must stay in isolated state');
  console.log('COMMAND_PARITY_OK','V1_SSE',sseChecked,'LOCALES',translations,'HELP_PAGES',sections,'NO_TRUNCATION',true,'KEY_REDACTION',true,
    'POSIX_MODE_CHECKED',process.platform !== 'win32','WIN_ACL_NOT_ASSERTED',process.platform === 'win32');
} finally {
  // Avoid touching any real user credential, config, or library outside temp.
  fs.rmSync(temp,{recursive:true,force:true});
}
