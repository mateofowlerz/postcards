import test from 'node:test';
import assert from 'node:assert/strict';
import { getSamplePage, normalizeQuery } from '../src/lib/postcards.ts';

test('100 distinct records load in 40/40/20 pages and then stop', () => {
  const pages = [];
  let cursor = 0;
  do {
    const page = getSamplePage('', cursor);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor !== null);
  assert.deepEqual(pages.map(page => page.items.length), [40, 40, 20]);
  assert.equal(new Set(pages.flatMap(page => page.items.map(card => card.id))).size, 100);
  assert.ok(pages.every(page => page.total === 100));
  assert.equal(getSamplePage('', 100).nextCursor, null);
});

test('place search matches city, region and landmark independent of case and word order', () => {
  for (const query of ['LAKE HARMONY', 'Pennsylvania', 'Pocono Mountains', 'Rock Split', ' lake   harmony ']) {
    assert.equal(getSamplePage(query).total, 100);
    assert.equal(getSamplePage(query, 80).items.length, 20);
  }
  for (const query of ['Paris', '%', '_', "' OR 1=1 --"]) {
    assert.deepEqual(getSamplePage(query), {items: [], total: 0, nextCursor: null});
  }
});

test('query normalization trims whitespace and bounds input', () => {
  assert.equal(normalizeQuery('  Lake   Harmony  '), 'Lake Harmony');
  assert.equal(normalizeQuery('a'.repeat(200)).length, 120);
});
