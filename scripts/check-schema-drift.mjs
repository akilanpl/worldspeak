#!/usr/bin/env node
/* eslint-disable no-console -- approved artifact integrity check */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const snapshot=JSON.parse(readFileSync('docs/evidence/supabase-project.json','utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
for(const item of [...snapshot.migrations,snapshot.types])if(hash(item.path)!==item.sha256)throw Error('Schema/type artifact changed: reconcile with hosted schema and regenerate before updating '+item.path);
const actual=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
if(JSON.stringify(actual)!==JSON.stringify(snapshot.migrations.map(x=>x.path.split('/').pop()).sort()))throw Error('Migration inventory drift');
console.log('Approved SQL/type snapshot matches; this offline guard does not query live schema drift.');
