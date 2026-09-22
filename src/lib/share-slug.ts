const reservedSlugs = new Set(['api', 'postcard', 'images', '_next']);
const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function messageSlug(message: string): string {
  const words = message.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’]/g, '').match(/[a-z0-9]+/g) ?? [];
  return words.slice(0, 3).join('-').slice(0, 24).replace(/-+$/, '') || 'card';
}

export function isShareSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 64 && !reservedSlugs.has(slug);
}

// The store must claim a slug atomically, rather than checking then inserting.
export async function reserveShareSlug(
  message: string,
  claim: (slug: string) => Promise<boolean>,
  randomCharacter = () => alphabet[crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length],
): Promise<string> {
  const base = messageSlug(message);
  let suffix = '';
  for (let attempt = 0; attempt < 32; attempt++) {
    const slug = suffix ? `${base}-${suffix}` : base;
    if (isShareSlug(slug) && await claim(slug)) return slug;
    suffix += randomCharacter();
  }
  throw new Error('Could not allocate a unique postcard link.');
}
