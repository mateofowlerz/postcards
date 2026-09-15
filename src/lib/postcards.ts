export const PAGE_SIZE = 40;
export const MAX_QUERY_LENGTH = 120;

export type Postcard = {
  id: number;
  title: string;
  place: string;
  imageUrl: string;
  width: number;
  height: number;
};

export type PostcardPage = {
  items: Postcard[];
  nextCursor: number | null;
  total: number;
};

export function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

export const samplePostcards: Postcard[] = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  title: "Split Rock",
  place: "Lake Harmony, Pocono Mountains, Pennsylvania, United States",
  imageUrl: "/images/split-rock-postcard.png",
  width: 2064,
  height: 2620,
}));

export function getSamplePage(query = "", cursor = 0): PostcardPage {
  const terms = normalizeQuery(query).toLowerCase().split(" ").filter(Boolean);
  const matches = samplePostcards.filter((card) => {
    const place = `${card.title} ${card.place}`.toLowerCase();
    return terms.every((term) => place.includes(term));
  });
  const remaining = matches.filter((card) => card.id > cursor);
  const items = remaining.slice(0, PAGE_SIZE);
  return {
    items,
    nextCursor: remaining.length > PAGE_SIZE ? items.at(-1)!.id : null,
    total: matches.length,
  };
}
