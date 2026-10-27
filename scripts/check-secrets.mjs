#!/usr/bin/env node
/* eslint-disable no-console -- sanitized file/line diagnostics only */
import { execFileSync } from 'node:child_process';
const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{maxBuffer:32*1024*1024});
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['provider-token',/\b(?:sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{15,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{30,})/],
  ['jwt',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['credential-url',/(?:https?|postgres(?:ql)?|redis):\/\/[^\s/:]+:[^\s/@]+@/i],
  ['literal-credential',/(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|auth[_-]?token)\s*[:=]\s*['"][A-Za-z0-9_\-+/=]{16,}['"]/i],
];
const blobs=new Map();
function addTree(ref){
  for(const row of git('ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean)){
    const [meta,path]=row.split('\t');const [mode,type,oid]=meta.split(' ');
    if(type!=='blob'||!['100644','100755'].includes(mode))throw Error('Nonregular Git entry requires review: '+path);
    blobs.set(oid,path);
  }
}
const at=process.argv.indexOf('--history');
if(at>=0){const ref=process.argv[at+1];if(!ref)throw Error('Commit required');for(const commit of git('rev-list',ref).toString().trim().split('\n'))addTree(commit);}
else for(const row of git('ls-files','--stage','-z').toString().split('\0').filter(Boolean)){
  const [meta,path]=row.split('\t');const [mode,oid,stage]=meta.split(' ');
  if(stage!=='0'||!['100644','100755'].includes(mode))throw Error('Unmerged/nonregular index entry: '+path);
  blobs.set(oid,path);
}
let failures=0;
for(const [oid,path] of blobs){
  if(/(^|\/)(?:\.env(?:\..*)?|credentials(?:\..*)?|\.npmrc|\.netrc|id_rsa|id_ed25519|.*\.(?:pem|p12|pfx|key|sqlite|har))$/i.test(path)&&path!=='.env.example'){
    console.error('secret-scan: sensitive path '+path);failures++;continue;
  }
  const bytes=git('cat-file','blob',oid);
  if(bytes.includes(0))continue;
  bytes.toString('utf8').split('\n').forEach((line,i)=>{
    for(const [label,pattern] of rules)if(pattern.test(line)){console.error(`secret-scan: ${path}:${i+1}: ${label} (value suppressed)`);failures++;}
  });
}
if(failures){console.error(`secret-scan: FAILED (${failures} findings)`);process.exit(1);}
console.log(`secret-scan: no secrets detected in ${blobs.size} unique ${at>=0?'historical':'indexed'} blobs; no content exclusions`);
