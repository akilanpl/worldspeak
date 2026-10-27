#!/usr/bin/env node
import {loadEnvFile} from 'node:process';
import {statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
try {
 const files=process.argv.slice(2);
 if(files.length!==2)throw Error();
 for(const path of files){const s=statSync(path);if(!s.isFile()||(s.mode&0o777)!==0o600||s.uid!==process.getuid())throw Error();loadEnvFile(path);}
 // Even an accidentally inherited live marker cannot reach generation here.
 delete process.env.WORLDSPEAK_LIVE_INFERENCE_APPROVED;
 delete process.env.META_MODEL_API_KEY;
 const require=createRequire(resolve(root,'apps/worker/package.json'));
 const r=spawnSync(process.execPath,[require.resolve('tsx/cli'),resolve(root,'apps/worker/src/cleanup.ts')],{cwd:root,env:process.env,stdio:'inherit',timeout:45000});
 process.exitCode=r.status===0?0:1;
} catch {console.error('Cleanup configuration/startup failed; secrets suppressed.');process.exitCode=1;}
