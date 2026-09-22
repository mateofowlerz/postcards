import { preload } from 'react-dom';
import patterns from '@/lib/patterns.json';
import { SharedPostcardClient } from './shared-postcard-client';
import { socialMetadata } from '@/lib/social-metadata';

// Legacy URL fragments are unavailable to crawlers, so use the site preview.
export const metadata = {
  ...socialMetadata({ title: 'Somebody sent you a postcard', description: 'Open your postcard and read the note inside.', path: '/postcard' }),
  robots: { index: false, follow: false },
};

export default async function SharedPostcardPage({ searchParams }: PageProps<'/postcard'>) {
  const params = await searchParams;
  const requested = Number(typeof params.p === 'string' ? params.p : -1);
  const pattern = Number.isInteger(requested) && requested >= 0 && requested < patterns.length ? patterns[requested] : null;
  if (pattern) preload(pattern.imageUrl, { as: 'image', fetchPriority: 'high' });
  return <div className="shared-page-shell" style={pattern ? { backgroundImage: `linear-gradient(rgb(255 253 245 / .22), rgb(255 253 245 / .22)), url(${pattern.imageUrl})` } : undefined}>
    <SharedPostcardClient />
  </div>;
}
