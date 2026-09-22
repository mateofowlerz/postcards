import { getPostcard } from '@/lib/postcard-repository';
import { postcardOgImage } from '@/lib/og-image';
import { SITE_URL } from '@/lib/social-metadata';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('card') ?? '1';
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return new Response('Invalid postcard', { status: 400 });
  const card = await getPostcard(Number(id));
  if (!card) return new Response('Postcard not found', { status: 404 });

  // Public production assets also work while builds/previews are deployment-protected.
  const source = await fetch(new URL(card.imageUrl, SITE_URL), { next: { revalidate: 86400 } });
  if (!source.ok) return new Response('Postcard image unavailable', { status: 502 });
  const type = source.headers.get('content-type')?.split(';')[0];
  if (!type?.startsWith('image/')) return new Response('Invalid postcard image', { status: 502 });
  const image = `data:${type};base64,${Buffer.from(await source.arrayBuffer()).toString('base64')}`;
  return postcardOgImage(card, image);
}
