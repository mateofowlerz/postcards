import 'server-only';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/lib/hidden-postcards.json');
let pending = Promise.resolve();

export async function getHiddenPostcardIds(): Promise<number[]> {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function hidePostcard(id: number) {
  const operation = pending.then(async () => {
    const ids = await getHiddenPostcardIds();
    if (!ids.includes(id)) await writeFile(file, JSON.stringify([...ids, id], null, 2) + '\n');
  });
  pending = operation.catch(() => {});
  await operation;
}
