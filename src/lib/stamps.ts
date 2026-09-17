import importedStamps from './stamps.json';
import hiddenStamps from './hidden-stamps.json';
export type Stamp = { id: string; title: string; imageUrl: string };
export const stamps: Stamp[] = importedStamps.filter(stamp => !(hiddenStamps as string[]).includes(stamp.id));
