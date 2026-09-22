import { readFile } from 'node:fs/promises';
import { createDatabase } from '../src/lib/database.ts';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running db:shares.');
const sql = createDatabase(process.env.DATABASE_URL);
const schema = await readFile(new URL('../db/shared-postcards.sql', import.meta.url), 'utf8');
try {
  await sql.begin(transaction => transaction.unsafe(schema));
  console.log('Shared postcard storage is ready.');
} finally {
  await sql.end();
}
