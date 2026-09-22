import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, link, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SharedPostcard } from './shared-postcard';

export function localShareStore(directory: string) {
  return {
    async claim(slug: string, postcard: SharedPostcard): Promise<boolean> {
      await mkdir(directory, { recursive: true });
      const temporary = path.join(directory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(postcard), { flag: 'wx', mode: 0o600 });
        // Publish a complete file atomically; link refuses to overwrite an existing slug.
        await link(temporary, path.join(directory, `${slug}.json`));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw error;
      } finally {
        await unlink(temporary).catch(() => {});
      }
    },
    async get(slug: string): Promise<SharedPostcard | null> {
      try {
        return JSON.parse(await readFile(path.join(directory, `${slug}.json`), 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
  };
}
