import { preload } from 'react-dom';
import patterns from '@/lib/patterns.json';
import { SharedPostcardClient } from './shared-postcard-client';

export default async function SharedPostcardPage({ searchParams }: PageProps<'/postcard'>) {
  const params = await searchParams;
  const requested = Number(typeof params.p === 'string' ? params.p : -1);
  const pattern = Number.isInteger(requested) && requested >= 0 && requested < patterns.length ? patterns[requested] : null;
  if (pattern) preload(pattern.imageUrl, { as: 'image', fetchPriority: 'high' });
  return <div className="shared-page-shell" style={pattern ? { backgroundImage: `linear-gradient(rgb(255 253 245 / .22), rgb(255 253 245 / .22)), url(${pattern.imageUrl})` } : undefined}>
    <SharedPostcardClient />
  </div>;
}
