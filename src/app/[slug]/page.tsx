import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { preload } from 'react-dom';
import patterns from '@/lib/patterns.json';
import { getPostcard } from '@/lib/postcard-repository';
import { getSharedPostcard } from '@/lib/shared-postcard-repository';
import { SharedPostcardClient } from '../postcard/shared-postcard-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedPostcardPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const draft = await getSharedPostcard(slug);
  if (!draft) notFound();
  const card = await getPostcard(draft.id);
  if (!card) notFound();
  const pattern = patterns[draft.patternIndex ?? Math.abs(card.id) % patterns.length];
  if (pattern) preload(pattern.imageUrl, { as: 'image', fetchPriority: 'high' });
  return <div className="shared-page-shell" style={pattern ? { backgroundImage: `linear-gradient(rgb(255 253 245 / .22), rgb(255 253 245 / .22)), url(${pattern.imageUrl})` } : undefined}>
    <SharedPostcardClient key={slug} initialReceived={{ card, draft }} />
  </div>;
}
