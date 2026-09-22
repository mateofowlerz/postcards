import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { messageSlug, isShareSlug, reserveShareSlug } from '../src/lib/share-slug.ts';
import { parseSharedPostcard } from '../src/lib/shared-postcard.ts';
import { localShareStore } from '../src/lib/local-share-store.ts';
import { readShareRequest, ShareTooLargeError, MAX_SHARE_BYTES } from '../src/lib/share-request.ts';

const postcard = {
  id: 1, message: 'Wish you were here!', address: 'For a friend', stampId: 'stamp-1',
  stamps: [{ id: 'stamp-1', x: 82.5, y: 20 }], patternIndex: 2,
};

test('message slugs stay short and handle accents, punctuation and empty text', () => {
  assert.equal(messageSlug(postcard.message), 'wish-you-were');
  assert.equal(messageSlug('  ¡Feliz cumpleaños, María! 🎉'), 'feliz-cumpleanos-maria');
  assert.equal(messageSlug("You're the best"), 'youre-the-best');
  assert.equal(messageSlug('a'.repeat(100)), 'a'.repeat(24));
  assert.equal(messageSlug('a'.repeat(23) + ' hello'), 'a'.repeat(23));
  for (const message of ['', '  ', '💌', '你好']) assert.equal(messageSlug(message), 'card');
  for (const slug of ['../test', 'Hello', 'api', 'postcard', 'images', 'a'.repeat(65)]) assert.equal(isShareSlug(slug), false);
});

test('collisions append random characters until a slug is claimed', async () => {
  const claimed = new Set(['wish-you-were', 'wish-you-were-a', 'wish-you-were-ab']);
  const characters = ['a', 'b', '7'];
  const result = await reserveShareSlug(postcard.message, async slug => !claimed.has(slug), () => characters.shift());
  assert.equal(result, 'wish-you-were-ab7');
  assert.equal(await reserveShareSlug('postcard', async () => true, () => '3'), 'postcard-3');
});

test('storage failures propagate instead of retrying as collisions', async () => {
  let attempts = 0;
  await assert.rejects(reserveShareSlug('hello', async () => {
    attempts++;
    throw new Error('storage offline');
  }), /storage offline/);
  assert.equal(attempts, 1);
});

test('concurrent shares never overwrite and survive reopening the store', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'postcard-shares-'));
  try {
    const store = localShareStore(directory);
    const payloads = Array.from({ length: 40 }, (_, index) => ({ ...postcard, address: `Friend ${index}` }));
    const slugs = await Promise.all(payloads.map(payload => reserveShareSlug(payload.message, slug => store.claim(slug, payload))));
    assert.equal(new Set(slugs).size, payloads.length);
    assert.ok(slugs.includes('wish-you-were'));
    const reopened = localShareStore(directory);
    for (let index = 0; index < slugs.length; index++) assert.deepEqual(await reopened.get(slugs[index]), payloads[index]);
    assert.equal(await reopened.get('missing'), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('share validation preserves the full draft and rejects malformed payloads', () => {
  assert.deepEqual(parseSharedPostcard(postcard, 7), postcard);
  for (const change of [
    { id: '1' }, { id: -1 }, { message: 'a'.repeat(2001) }, { address: 'a'.repeat(401) },
    { stampId: null }, { patternIndex: 7 }, { patternIndex: -1 },
    { stamps: Array(21).fill(postcard.stamps[0]) }, { stamps: [{ id: 'x', x: '20', y: 1 }] },
    { stamps: [{ id: 'x', x: Infinity, y: 1 }] }, { stamps: [{ id: 'x', x: 1, y: -1 }] },
  ]) assert.equal(parseSharedPostcard({ ...postcard, ...change }, 7), null);
  assert.equal(parseSharedPostcard(null, 7), null);
});

test('validation accepts maximum lengths, emoji, every pattern, and boundary stamp coordinates', () => {
  for (let patternIndex = 0; patternIndex < 7; patternIndex++) {
    const payload = { id: 0, message: '💌'.repeat(1000), address: 'é'.repeat(400), stampId: 's'.repeat(100),
      stamps: Array.from({ length: 20 }, (_, index) => ({ id: 's'.repeat(100), x: index % 2 ? 0 : 100, y: index % 2 ? 100 : 0 })), patternIndex };
    assert.deepEqual(parseSharedPostcard(payload, 7), payload);
  }
});

test('validation rejects database-incompatible Unicode in every text field', () => {
  for (const text of ['a\0b', '\ud800', '\udfff', 'valid\ud800invalid']) {
    for (const field of ['message', 'address', 'stampId']) assert.equal(parseSharedPostcard({ ...postcard, [field]: text }, 7), null);
    assert.equal(parseSharedPostcard({ ...postcard, stamps: [{ id: text, x: 0, y: 0 }] }, 7), null);
  }
});

test('required fields cannot be omitted or replaced by JSON primitives', () => {
  for (const field of ['id', 'message', 'address', 'stampId']) {
    const payload = { ...postcard };
    delete payload[field];
    assert.equal(parseSharedPostcard(payload, 7), null);
  }
  for (const value of [null, false, true, 1, 'hello', [], {}]) assert.equal(parseSharedPostcard(value, 7), null);
  for (const stamps of [false, {}, [null], ['x'], [{ id: 'x', x: 101, y: 0 }], [{ id: 'x', x: 0, y: NaN }]]) {
    assert.equal(parseSharedPostcard({ ...postcard, stamps }, 7), null);
  }
});

test('normalized and truncated messages still allocate distinct slugs', async () => {
  const claimed = new Set();
  for (const message of ['Hello there friend', 'HELLO there friend!', 'hello there friend again', 'héllo there friend']) {
    const slug = await reserveShareSlug(message, async candidate => {
      if (claimed.has(candidate)) return false;
      claimed.add(candidate);
      return true;
    });
    assert.ok(slug.startsWith('hello-there-friend'));
    assert.ok(isShareSlug(slug));
  }
  assert.equal(claimed.size, 4);
});

test('persistent collisions fail without returning an unclaimed link', async () => {
  let attempts = 0;
  await assert.rejects(reserveShareSlug('hello', async () => { attempts++; return false; }, () => 'a'), /unique postcard link/);
  assert.equal(attempts, 32);
});

test('request reader handles UTF-8 split across streamed chunks', async () => {
  const payload = { ...postcard, message: '💌 ¡Hola! 你好' };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  const request = new Request('http://localhost/api/share', { method: 'POST', body, duplex: 'half' });
  assert.deepEqual(await readShareRequest(request), payload);
});

test('request reader rejects malformed JSON, invalid UTF-8, and empty bodies', async () => {
  for (const body of ['', '{broken', Uint8Array.of(0xc3, 0x28)]) {
    await assert.rejects(readShareRequest(new Request('http://localhost/api/share', { method: 'POST', body })));
  }
  await assert.rejects(readShareRequest(new Request('http://localhost/api/share', { method: 'POST' })));
});

test('request size limit checks bytes and cancels oversized streams', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_SHARE_BYTES + 1)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readShareRequest(new Request('http://localhost/api/share', { method: 'POST', body: stream, duplex: 'half' })), ShareTooLargeError);
  assert.equal(cancelled, true);
  await assert.rejects(readShareRequest(new Request('http://localhost/api/share', { method: 'POST', body: '{}', headers: { 'content-length': String(MAX_SHARE_BYTES + 1) } })), ShareTooLargeError);
  const exactBody = '"' + 'a'.repeat(MAX_SHARE_BYTES - 2) + '"';
  assert.equal((await readShareRequest(new Request('http://localhost/api/share', { method: 'POST', body: exactBody }))).length, MAX_SHARE_BYTES - 2);
});
