#!/usr/bin/env node
/* eslint-disable no-console -- approved artifact integrity check */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const snapshot=JSON.parse(readFileSync('docs/evidence/supabase-project.json','utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
for(const item of [...snapshot.migrations,snapshot.types])if(hash(item.path)!==item.sha256)throw Error('Schema/type artifact changed: reconcile with hosted schema and regenerate before updating '+item.path);
const pending=existsSync('docs/evidence/inference-migration-pending.json')?JSON.parse(readFileSync('docs/evidence/inference-migration-pending.json','utf8')):{applied:false,artifacts:[]};
if(pending.applied!==false)throw Error('Pending inventory must not claim a hosted apply');
for(const item of pending.artifacts)if(hash(item.path)!==item.sha256)throw Error('Pending inference artifact changed: '+item.path);
const actual=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
if(JSON.stringify(actual)!==JSON.stringify([...snapshot.migrations,...pending.artifacts.filter(x=>x.path.endsWith('.sql'))].map(x=>x.path.split('/').pop()).sort()))throw Error('Migration inventory drift');
console.log('Hosted SQL/type snapshot and any explicitly pending artifacts match; offline guard, no live schema query.');
