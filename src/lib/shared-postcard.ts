export type PlacedStamp = { id: string; x: number; y: number };
export type PostcardDraft = { message: string; address: string; stampId: string; stamps?: PlacedStamp[]; patternIndex?: number };
export type SharedPostcard = PostcardDraft & { id: number };

function validText(value: unknown, maxLength: number): value is string {
  // PostgreSQL JSONB cannot store NULs or unpaired UTF-16 surrogates.
  return typeof value === 'string' && value.length <= maxLength && !value.includes('\0') && value.isWellFormed();
}

export function parseSharedPostcard(value: unknown, patternCount: number): SharedPostcard | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.id) || (data.id as number) < 0 ||
    !validText(data.message, 2000) || !validText(data.address, 400) || !validText(data.stampId, 100)) return null;
  if (data.patternIndex !== undefined && (!Number.isInteger(data.patternIndex) ||
    (data.patternIndex as number) < 0 || (data.patternIndex as number) >= patternCount)) return null;
  if (data.stamps !== undefined && (!Array.isArray(data.stamps) || data.stamps.length > 20 ||
    !data.stamps.every(stamp => stamp && validText(stamp.id, 100) &&
      typeof stamp.x === 'number' && Number.isFinite(stamp.x) && stamp.x >= 0 && stamp.x <= 100 &&
      typeof stamp.y === 'number' && Number.isFinite(stamp.y) && stamp.y >= 0 && stamp.y <= 100))) return null;
  return {
    id: data.id as number, message: data.message, address: data.address, stampId: data.stampId,
    stamps: data.stamps as PlacedStamp[] | undefined, patternIndex: data.patternIndex as number | undefined,
  };
}
