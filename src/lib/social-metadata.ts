import type { Metadata } from 'next';

export const SITE_URL = 'https://postcards.page';

export function socialMetadata({
  title = 'Postcards',
  description = 'Browse vintage postcards, write a note, and send one to someone you miss.',
  path = '/',
  cardId = 1,
  imageAlt = 'A vintage postcard from the Postcards collection',
}: { title?: string; description?: string; path?: string; cardId?: number; imageAlt?: string } = {}): Metadata {
  const image = { url: `${SITE_URL}/api/og?card=${cardId}&v=1`, width: 1200, height: 630, alt: imageAlt, type: 'image/png' };
  return {
    title,
    description,
    openGraph: { type: 'website', siteName: 'Postcards', title, description, url: `${SITE_URL}${path}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
