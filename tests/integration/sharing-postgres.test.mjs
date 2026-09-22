import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createDatabase } from '../../src/lib/database.ts';
import { postgresShareStore } from '../../src/lib/postgres-share-store.ts';
import { reserveShareSlug } from '../../src/lib/share-slug.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the database integration tests.');

test('150 shares across six database clients remain unique and preserve every payload after reconnecting', async () => {
  const run = randomBytes(4).toString('hex');
  const clients = Array.from({ length: 6 }, () => createDatabase(process.env.DATABASE_URL));
  const stores = clients.map(postgresShareStore);
  const payloads = Array.from({ length: 150 }, (_, index) => ({
    id: index % 2, message: `qa${run} same message — ¡Hola! 💌`, address: `Disposable integration test ${run}/${index}`,
    stampId: 'test-stamp', stamps: [{ id: 'test-stamp', x: index % 100, y: (index * 2) % 100 }], patternIndex: index % 7,
  }));
  let reader;
  try {
    const slugs = await Promise.all(payloads.map((payload, index) => reserveShareSlug(payload.message, slug => stores[index % stores.length].claim(slug, payload))));
    assert.equal(new Set(slugs).size, payloads.length);
    assert.equal(slugs.filter(slug => slug === `qa${run}-same-message`).length, 1);
    assert.equal(await stores[0].claim(slugs[0], { ...payloads[0], message: 'must not overwrite' }), false);
    await Promise.all(clients.map(client => client.end()));
    reader = createDatabase(process.env.DATABASE_URL);
    const reopened = postgresShareStore(reader);
    const saved = await Promise.all(slugs.map(slug => reopened.get(slug)));
    assert.deepEqual(saved, payloads);
    assert.equal(await reopened.get(`missing-${run}`), null);
  } finally {
    await Promise.all(clients.map(client => client.end()));
    reader ??= createDatabase(process.env.DATABASE_URL);
    await reader`DELETE FROM shared_postcards WHERE payload->>'message' = ${payloads[0].message}`;
    await reader.end();
  }
});

test('Supabase anonymous and authenticated roles cannot read or write shares directly', async () => {
  const sql = createDatabase(process.env.DATABASE_URL);
  try {
    const [table] = await sql`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.shared_postcards'::regclass`;
    assert.equal(table.relrowsecurity, true);
    for (const role of ['anon', 'authenticated']) {
      const [permissions] = await sql`SELECT has_table_privilege(${role}, 'public.shared_postcards', 'SELECT, INSERT, UPDATE, DELETE') AS allowed`;
      assert.equal(permissions.allowed, false);
    }
  } finally { await sql.end(); }
});
