import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createDatabase } from '../../src/lib/database.ts';

const origin = process.env.POSTCARDS_TEST_ORIGIN ?? 'http://localhost:3000';
const run = randomBytes(6).toString('hex');
const created = [];
const sql = process.env.DATABASE_URL ? createDatabase(process.env.DATABASE_URL) : null;
const payload = { id: 1, message: `qa${run} hello world`, address: `Disposable HTTP test ${run}`, stampId: '', stamps: [], patternIndex: 0 };
const post = body => fetch(`${origin}/api/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) });

test.after(async () => {
  if (sql) {
    for (const slug of created) await sql`DELETE FROM shared_postcards WHERE slug = ${slug} AND starts_with(payload->>'address', ${payload.address})`;
    await sql.end();
  }
});

test('60 concurrent HTTP shares have unique URLs and exact database snapshots', async () => {
  const requests = Array.from({ length: 60 }, (_, index) => ({ ...payload, id: index % 2, address: `${payload.address}/${index}`, patternIndex: index % 7 }));
  const outcomes = await Promise.all(requests.map(async item => {
    const response = await post(item);
    assert.equal(response.status, 201);
    const body = await response.json();
    created.push(body.slug);
    assert.equal(body.path, `/${body.slug}`);
    assert.ok(!body.path.includes('#'));
    return body;
  }));
  assert.equal(new Set(outcomes.map(outcome => outcome.slug)).size, requests.length);
  if (sql) {
    const rows = await sql`SELECT slug, payload FROM shared_postcards WHERE slug IN ${sql(outcomes.map(outcome => outcome.slug))}`;
    const saved = new Map(rows.map(row => [row.slug, row.payload]));
    outcomes.forEach((outcome, index) => assert.deepEqual(saved.get(outcome.slug), requests[index]));
  }
  for (const outcome of outcomes.slice(0, 10)) {
    const response = await fetch(origin + outcome.path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('Open the mailbox to see your postcard'));
    assert.ok(html.includes('noindex'));
  }
});

test('empty, multilingual, SQL-looking and HTML-looking messages round-trip safely', async () => {
  for (const message of ['', '   ', '💌', '你好，朋友', '¡Feliz cumpleaños, María!', "Robert'); DROP TABLE shared_postcards;--", '<script>alert("test")</script>', '💌'.repeat(1000)]) {
    const data = { ...payload, message, stamps: Array.from({ length: 20 }, (_, index) => ({ id: `test-${index}`, x: index, y: index * 2 })) };
    const response = await post(data);
    assert.equal(response.status, 201);
    const { slug, path } = await response.json();
    created.push(slug);
    assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
    if (sql) {
      const [row] = await sql`SELECT payload FROM shared_postcards WHERE slug = ${slug}`;
      assert.deepEqual(row.payload, data);
    }
    const receipt = await fetch(origin + path);
    assert.equal(receipt.status, 200);
    const html = await receipt.text();
    assert.ok(!html.includes('<script>alert("test")</script>'));
  }
});

test('invalid postcards consistently return 400 without storing a link', async () => {
  const invalid = [null, [], {}, false, 123,
    ...[{ id: -1 }, { id: 999999999 }, { id: '1' }, { id: 0.5 }, { message: 42 }, { message: 'a'.repeat(2001) },
      { message: '\0' }, { message: '\ud800' }, { address: 'a'.repeat(401) }, { stampId: 's'.repeat(101) },
      { patternIndex: -1 }, { patternIndex: 7 }, { patternIndex: 0.5 }, { stamps: [{}] }, { stamps: [null] },
      { stamps: Array(21).fill({ id: 's', x: 0, y: 0 }) }, { stamps: [{ id: 's', x: 101, y: 0 }] }].map(change => ({ ...payload, ...change }))];
  for (const data of invalid) {
    const response = await post(data);
    assert.equal(response.status, 400);
    assert.ok(!(await response.json()).slug);
  }
  for (const body of ['{bad JSON', '', Uint8Array.of(0xff)]) assert.equal((await post(body)).status, 400);
});

test('oversized bodies, unsupported methods and missing links return the expected status', async () => {
  assert.equal((await post('x'.repeat(30001))).status, 413);
  assert.equal((await post(JSON.stringify({ message: '💌'.repeat(10000) }))).status, 413);
  assert.equal((await fetch(`${origin}/api/share`)).status, 405);
  for (const slug of [`missing-${run}`, 'UPPERCASE', 'a'.repeat(65), 'trailing-']) assert.equal((await fetch(`${origin}/${slug}`)).status, 404);
});
