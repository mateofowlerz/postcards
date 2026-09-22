export const MAX_SHARE_BYTES = 30000;
export class ShareTooLargeError extends Error {}

export async function readShareRequest(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_SHARE_BYTES) throw new ShareTooLargeError();
  if (!request.body) throw new SyntaxError('Missing postcard');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let body = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_SHARE_BYTES) {
        await reader.cancel();
        throw new ShareTooLargeError();
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
