import test from 'node:test';
import assert from 'node:assert/strict';
import { getSamplePage, normalizeQuery, samplePostcards } from '../src/lib/postcards.ts';

test('mixed order is stable and hidden postcards stay out of pagination', () => {
  const first = getSamplePage();
  assert.deepEqual(first, getSamplePage());
  const hidden = [first.items[0].id, first.items[1].id];
  const pages = [];
  let cursor = 0;
  do {
    const page = getSamplePage('', cursor, hidden);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor !== null);
  const ids = pages.flatMap(page => page.items.map(card => card.id));
  assert.equal(ids.length, samplePostcards.length - hidden.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(hidden.every(id => !ids.includes(id)));
  assert.ok(first.items.some(card => card.id > 20000000));
  assert.ok(first.items.some(card => card.id > 1000000 && card.id < 2000000));
});

test('every distinct postcard paginates in groups of 40 and then stops', () => {
  const pages = [];
  let cursor = 0;
  do {
    const page = getSamplePage('', cursor);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor !== null);
  const expectedLengths = Array.from({ length: Math.ceil(samplePostcards.length / 40) }, (_, index) => Math.min(40, samplePostcards.length - index * 40));
  assert.deepEqual(pages.map(page => page.items.length), expectedLengths);
  assert.equal(new Set(pages.flatMap(page => page.items.map(card => card.id))).size, samplePostcards.length);
  assert.ok(pages.every(page => page.total === samplePostcards.length));
  assert.equal(getSamplePage('', Number.MAX_SAFE_INTEGER).nextCursor, null);
});

test('place search matches city, region and landmark independent of case and word order', () => {
  for (const query of ['BOGLIASCO', 'Italy', 'Italian Riviera', '1900 Bogliasco', ' italian   riviera ']) {
    assert.ok(getSamplePage(query).total >= 1);
    assert.ok(getSamplePage(query, 0).items.length >= 1);
  }
  for (const query of ['a-place-that-is-not-in-this-collection', '%', "' OR 1=1 --"]) {
    assert.deepEqual(getSamplePage(query), {items: [], total: 0, nextCursor: null});
  }
});

test('filename search treats underscores literally', () => {
  const page = getSamplePage('_');
  assert.ok(page.total > 0);
  assert.ok(page.items.every(card => card.title.includes('_') || card.place.includes('_')));
});

test('query normalization trims whitespace and bounds input', () => {
  assert.equal(normalizeQuery('  Lake   Harmony  '), 'Lake Harmony');
  assert.equal(normalizeQuery('a'.repeat(200)).length, 120);
});





