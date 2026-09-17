import arenaPostcards from './arena-postcards.json' with { type: 'json' };

export const PAGE_SIZE = 40;
export const MAX_QUERY_LENGTH = 120;

export type Postcard = {
  id: number;
  title: string;
  place: string;
  imageUrl: string;
  width: number;
  height: number;
  crop?: number[];
  backImageUrl?: string;
  sourceUrl?: string;
};

export type PostcardPage = {
  items: Postcard[];
  nextCursor: number | null;
  total: number;
};

export function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

export const samplePostcards: Postcard[] = [{
  id: 1, title: 'Bogliasco, 1900', place: 'Italian Riviera, Italy',
  imageUrl: '/images/bogliasco-front.jpg', backImageUrl: '/images/bogliasco-back.jpg',
  width: 1551, height: 984,
}, ...arenaPostcards].sort((a, b) => Number(isPortrait(a)) - Number(isPortrait(b)) || mixKey(a.id) - mixKey(b.id) || a.id - b.id);

function mixKey(id: number) {
  let value = id | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function getSamplePage(query = "", cursor = 0, hiddenIds: number[] = []): PostcardPage {
  const terms = normalizeQuery(query).toLowerCase().split(" ").filter(Boolean);
  const hidden = new Set(hiddenIds);
  const matches = samplePostcards.map((card, index) => ({ card, cursor: index + 1 })).filter(({ card }) => {
    const place = `${card.title} ${card.place}`.toLowerCase();
    return !hidden.has(card.id) && terms.every((term) => place.includes(term));
  });
  const remaining = matches.filter((entry) => entry.cursor > cursor);
  const page = remaining.slice(0, PAGE_SIZE);
  const items = page.map(entry => entry.card);
  return {
    items,
    nextCursor: remaining.length > PAGE_SIZE ? page.at(-1)!.cursor : null,
    total: matches.length,
  };
}




export function isPortrait(card: Postcard) { const [left, top, right, bottom] = card.crop ?? [0, 0, 0, 0]; return card.height - top - bottom > card.width - left - right; }

