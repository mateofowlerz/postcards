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

test('social previews expose crawler-visible metadata and valid postcard-specific PNGs', async () => {
  const pages = [{ path: '/', id: 1 }, { path: '/postcard', id: 1 }];
  for (const id of [0, 1]) {
    const response = await post({ ...payload, id });
    assert.equal(response.status, 201);
    const share = await response.json();
    created.push(share.slug);
    pages.push({ path: share.path, id });
  }
  for (const page of pages) {
    for (const userAgent of ['facebookexternalhit/1.1', 'Twitterbot/1.0', 'WhatsApp/2.0', 'Slackbot-LinkExpanding 1.0']) {
      const response = await fetch(origin + page.path, { headers: { 'User-Agent': userAgent } });
      assert.equal(response.status, 200);
      const head = (await response.text()).split('</head>')[0];
      const tags = head.match(/<meta\b[^>]*>/g) ?? [];
      const value = name => {
        const matching = tags.filter(tag => tag.includes(`property="${name}"`) || tag.includes(`name="${name}"`));
        assert.equal(matching.length, 1, `${page.path} ${userAgent}: ${name} must occur once in head`);
        return matching[0].match(/content="([^"]*)"/)[1].replaceAll('&amp;', '&');
      };
      assert.equal(value('og:image'), `https://postcards.page/api/og?card=${page.id}&v=1`);
      assert.equal(value('twitter:image'), value('og:image'));
      assert.equal(new URL(value('og:url')).href, `https://postcards.page${page.path}`);
      assert.equal(value('twitter:card'), 'summary_large_image');
      assert.equal(value('og:image:width'), '1200');
      assert.equal(value('og:image:height'), '630');
      assert.ok(!value('og:description').includes(payload.message));
      assert.ok(!value('og:description').includes(payload.address));
    }
  }
  const images = [];
  for (const id of [0, 1]) {
    const response = await fetch(`${origin}/api/og?card=${id}&v=1`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    const image = Buffer.from(await response.arrayBuffer());
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(image.readUInt32BE(16), 1200);
    assert.equal(image.readUInt32BE(20), 630);
    assert.ok(image.length < 5 * 1024 * 1024);
    images.push(image);
  }
  assert.ok(!images[0].equals(images[1]), 'Different postcards must have different artwork');
  for (const id of ['-1', 'bad', '1.5', '9007199254740992']) assert.equal((await fetch(`${origin}/api/og?card=${id}`)).status, 400);
  assert.equal((await fetch(`${origin}/api/og?card=999999999`)).status, 404);
});
