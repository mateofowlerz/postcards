import { readFile } from 'node:fs/promises';
import { createDatabase } from '../src/lib/database.ts';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running db:setup.');
const sql = createDatabase(process.env.DATABASE_URL);
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const seed = await readFile(new URL('../db/seed.sql', import.meta.url), 'utf8');
const statements = `${schema}\n${seed}`.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
try {
  await sql.begin(transaction => statements.map(statement => transaction.unsafe(statement)));
  console.log('Postcard schema and 100 sample records are ready.');
} finally {
  await sql.end();
}
