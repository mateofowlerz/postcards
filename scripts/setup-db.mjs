import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running db:setup.');
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const seed = await readFile(new URL('../db/seed.sql', import.meta.url), 'utf8');
const statements = `${schema}\n${seed}`.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
await sql.transaction(statements.map(statement => sql.query(statement, [])));
console.log('Postcard schema and 100 sample records are ready.');
