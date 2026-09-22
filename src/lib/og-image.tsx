import { ImageResponse } from 'next/og';
import type { Postcard } from './postcards';

export function postcardOgImage(card: Postcard, image: string) {
  const [left, top, right, bottom] = card.crop ?? [0, 0, 0, 0];
  const width = card.width - left - right;
  const height = card.height - top - bottom;
  const scale = Math.min(1056 / width, 480 / height);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4f0e5', color: '#423c31', padding: '36px 60px 24px' }}>
      <div style={{ display: 'flex', width: '100%', height: 500, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', width: width * scale, height: height * scale, boxShadow: '0 8px 22px rgba(50, 40, 25, 0.18)' }}>
          {/* ImageResponse renders pixels directly; next/image is not supported here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" width={card.width * scale} height={card.height * scale} style={{ position: 'absolute', left: -left * scale, top: -top * scale }} />
        </div>
      </div>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
        <span style={{ fontSize: 30, letterSpacing: 4 }}>POSTCARDS</span>
        <span style={{ fontSize: 22 }}>a little note from somewhere.</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
