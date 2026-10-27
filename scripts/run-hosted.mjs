#!/usr/bin/env node
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const root=resolve(import.meta.dirname,'..');
loadEnvFile(resolve(root,'.env.hosted.local'));
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://cafkyowssdemzivhzxbb.supabase.co')throw Error('Refusing unexpected project');
const require=createRequire(resolve(root,'apps/web/package.json'));
const args=process.argv.slice(2);
if (['start','dev'].includes(args[0]) && !args.includes('-H') && !args.includes('--hostname')) args.push('-H','127.0.0.1');
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),...args],{cwd:resolve(root,'apps/web'),env:process.env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',(code)=>{process.exitCode=code??1;});
