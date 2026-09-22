import 'server-only';
import { getDatabase } from './database';
import { postgresShareStore } from './postgres-share-store';
import path from 'node:path';
import { localShareStore } from './local-share-store';
import { isShareSlug, reserveShareSlug } from './share-slug';
import type { SharedPostcard } from './shared-postcard';

function shareStore() {
  if (process.env.DATABASE_URL) {
    return postgresShareStore(getDatabase());
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('DATABASE_URL and the shared_postcards migration are required for sharing.');
  }
  return localShareStore(path.join(process.cwd(), '.data', 'shared-postcards'));
}

export async function createSharedPostcard(postcard: SharedPostcard): Promise<string> {
  const store = shareStore();
  return reserveShareSlug(postcard.message, slug => store.claim(slug, postcard));
}

export async function getSharedPostcard(slug: string): Promise<SharedPostcard | null> {
  if (!isShareSlug(slug)) return null;
  return shareStore().get(slug);
}
