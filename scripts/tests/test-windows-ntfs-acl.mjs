#!/usr/bin/env node
/**
 * Native Windows security audit, not a POSIX chmod simulation.
 * Generates ONLY synthetic credentials in an isolated profile and inspects
 * the effective NTFS file ACLs using Windows PowerShell.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
if(process.platform!=='win32'){
 console.log('NTFS_AUDIT_SKIPPED_NON_WINDOWS');process.exit(0);
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'polli-v7-ntfs-'));
const previous={APPDATA:process.env.APPDATA,XDG_STATE_HOME:process.env.XDG_STATE_HOME,HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE};
try{
 process.env.APPDATA=path.join(temp,'appdata');
 process.env.XDG_STATE_HOME=path.join(temp,'state');
 process.env.HOME=path.join(temp,'home');
 process.env.USERPROFILE=path.join(temp,'home');
 for(const p of ['appdata','state','home'])fs.mkdirSync(path.join(temp,p),{recursive:true});
 const config=await import('../../dist/server/config.js');
 const reports=await import('../../dist/server/command-display.js');
 config.saveConfig({apiKey:'sk_fixture_not_a_real_key',mode:'manual'});
 const report=reports.persistCommandReport('Private key sk_fixture_not_a_real_key\nEND_MARKER','/poll qa security');
 assert(fs.existsSync(config.CONFIG_FILE),'config missing');
 assert(fs.existsSync(report),'report missing');
 assert(!fs.readFileSync(report,'utf8').includes('sk_fixture_not_a_real_key'),'redaction failed');
 const ps=[
  '$ErrorActionPreference="Stop"',
  '$paths=@(@{n="config";p=$env:POLLINATIONS_ACL_CONFIG},@{n="report";p=$env:POLLINATIONS_ACL_REPORT})',
  '$out=@(foreach($item in $paths){',
  ' $acl=Get-Acl -LiteralPath $item.p',
  ' $aces=@(foreach($ace in $acl.Access){',
  '  try{$sid=$ace.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value}catch{$sid=$ace.IdentityReference.Value}',
  '  @{sid=$sid;rights=[string]$ace.FileSystemRights;type=[string]$ace.AccessControlType;inherited=$ace.IsInherited}',
  ' })',
  ' @{name=$item.n;owner=[string]$acl.Owner;access=$aces}',
  '})',
  '$out | ConvertTo-Json -Compress -Depth 7',
 ].join(';');
 const x=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{
  env:{...process.env,POLLINATIONS_ACL_CONFIG:config.CONFIG_FILE,POLLINATIONS_ACL_REPORT:report},
  encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(x.status,0,'Get-Acl PowerShell failed: '+(x.stderr||'').slice(0,500));
 const results=JSON.parse((x.stdout||'').trim());
 const arr=Array.isArray(results)?results:[results];
 assert.equal(arr.length,2,'two NTFS ACLs must be inspected');
 let failures=0;
 for(const file of arr){
  const access=Array.isArray(file.access)?file.access:[file.access];
  const broad=access.filter(a=>
   ['S-1-1-0','S-1-5-11','S-1-5-32-545'].includes(a.sid) &&
   a.type==='Allow' &&
   /Read|FullControl|Modify|Write|Execute|Synchronize/i.test(a.rights));
  console.log('NTFS_FILE',file.name,'ACES',JSON.stringify(access.map(a=>({
   sid:a.sid,rights:a.rights,type:a.type,inherited:a.inherited
  }))));
  console.log('NTFS_BROAD_ACCESS',file.name,broad.length===0?'NONE':'DETECTED');
  if(broad.length)failures++;
 }
 console.log('NTFS_REAL_AUDIT_COMPLETE', 'broad_access_files', failures);
 assert.equal(failures, 0, 'SECURITY FAILURE: sensitive files grant NTFS read/write to a broad group');
}finally{
 for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;
 fs.rmSync(temp,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
