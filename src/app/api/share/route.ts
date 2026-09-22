import patterns from '@/lib/patterns.json';
import { getPostcard } from '@/lib/postcard-repository';
import { parseSharedPostcard } from '@/lib/shared-postcard';
import { createSharedPostcard } from '@/lib/shared-postcard-repository';
import { readShareRequest, ShareTooLargeError } from '@/lib/share-request';

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await readShareRequest(request);
  } catch (error) {
    if (error instanceof ShareTooLargeError) return Response.json({ error: 'Postcard is too large.' }, { status: 413 });
    return Response.json({ error: 'Invalid postcard.' }, { status: 400 });
  }
  const postcard = parseSharedPostcard(data, patterns.length);
  if (!postcard) return Response.json({ error: 'Invalid postcard.' }, { status: 400 });
  try {
    if (!await getPostcard(postcard.id)) return Response.json({ error: 'Postcard not found.' }, { status: 400 });
    const slug = await createSharedPostcard(postcard);
    return Response.json({ slug, path: `/${slug}` }, { status: 201 });
  } catch {
    return Response.json({ error: 'Your link could not be saved. Please try again.' }, { status: 503 });
  }
}
