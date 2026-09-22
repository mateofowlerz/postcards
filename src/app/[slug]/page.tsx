import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { preload } from 'react-dom';
import patterns from '@/lib/patterns.json';
import { getPostcard } from '@/lib/postcard-repository';
import { getSharedPostcard } from '@/lib/shared-postcard-repository';
import { SharedPostcardClient } from '../postcard/shared-postcard-client';
import { socialMetadata } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';
const getReceivedPostcard = cache(async (slug: string) => {
  const draft = await getSharedPostcard(slug);
  if (!draft) notFound();
  const card = await getPostcard(draft.id);
  if (!card) notFound();
  return { card, draft };
});

export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { card } = await getReceivedPostcard(slug);
  return {
    ...socialMetadata({ title: 'Somebody sent you a postcard', description: 'Open your postcard and read the note inside.', path: `/${slug}`, cardId: card.id, imageAlt: card.title }),
    robots: { index: false, follow: false },
  };
}

export default async function SharedPostcardPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const { card, draft } = await getReceivedPostcard(slug);
  const pattern = patterns[draft.patternIndex ?? Math.abs(card.id) % patterns.length];
  if (pattern) preload(pattern.imageUrl, { as: 'image', fetchPriority: 'high' });
  return <div className="shared-page-shell" style={pattern ? { backgroundImage: `linear-gradient(rgb(255 253 245 / .22), rgb(255 253 245 / .22)), url(${pattern.imageUrl})` } : undefined}>
    <SharedPostcardClient key={slug} initialReceived={{ card, draft }} />
  </div>;
}
