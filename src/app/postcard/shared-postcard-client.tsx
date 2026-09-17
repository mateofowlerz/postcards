"use client";

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PostcardViewer, type PostcardDraft } from '@/components/postcard-viewer';
import { samplePostcards, type Postcard } from '@/lib/postcards';

export function SharedPostcardClient() {
  const [received, setReceived] = useState<{ card: Postcard; draft: PostcardDraft } | null>(null);
  const [error, setError] = useState('');
  const [mailboxOpening, setMailboxOpening] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const mailboxTimer = useRef<number | null>(null);
  useEffect(() => {
    function loadPostcard() {
      if (mailboxTimer.current !== null) window.clearTimeout(mailboxTimer.current);
      setMailboxOpening(false);
      setMailboxOpen(false);
      setError('');
      try {
        const hash = window.location.hash.slice(1);
        if (!hash || hash.length > 30000) throw new Error();
        const binary = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
        const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
        const card = data.id === 0 ? { id: 0, title: 'Split Rock', place: 'Lake Harmony, Pennsylvania', imageUrl: '/images/split-rock-postcard.png', width: 2064, height: 2620 } : samplePostcards.find(card => card.id === data.id);
        if (!card || typeof data.message !== 'string' || data.message.length > 2000 || typeof data.address !== 'string' || data.address.length > 400 || typeof data.stampId !== 'string' || data.stampId.length > 100) throw new Error();
        const patternIndex = Number.isInteger(data.patternIndex) && data.patternIndex >= 0 && data.patternIndex < 7 ? data.patternIndex : undefined;
        const stamps = Array.isArray(data.stamps) ? data.stamps.filter((stamp: unknown) => { if (!stamp || typeof stamp !== 'object') return false; const item=stamp as Record<string,unknown>; return typeof item.id === 'string' && Number.isFinite(item.x) && Number.isFinite(item.y); }).slice(0, 20) : undefined;
        setReceived({ card, draft: { message: data.message, address: data.address, stampId: data.stampId, stamps, patternIndex } });
      } catch { setReceived(null); setError('This postcard link is invalid or incomplete.'); }
    }
    loadPostcard();
    window.addEventListener('hashchange', loadPostcard);
    return () => {
      window.removeEventListener('hashchange', loadPostcard);
      if (mailboxTimer.current !== null) window.clearTimeout(mailboxTimer.current);
    };
  }, []);
  function openMailbox() {
    if (mailboxOpening) return;
    setMailboxOpening(true);
    mailboxTimer.current = window.setTimeout(() => setMailboxOpen(true), 1050);
  }

  return <>
    <main className="shared-postcard-page">
      {error && <p role="alert">{error}</p>}
      {received && mailboxOpen && <PostcardViewer card={received.card} receivedDraft={received.draft} onClose={() => window.location.assign('/')} />}
    </main>
    {received && !mailboxOpen && <button type="button" className={`mailbox-receipt-gate ${mailboxOpening ? 'is-opening' : ''}`} onClick={openMailbox} aria-label="Open the mailbox to see your postcard">
      <span className="mailbox-receipt-copy">somebody sent you a postcard...</span>
      <span className="mailbox-receipt-visual" aria-hidden="true">
        <Image className="mailbox-receipt-closed" src="/images/mailbox-received-closed.png" alt="" width={1024} height={1536} priority />
        <Image className="mailbox-receipt-open" src="/images/mailbox-received-open.png" alt="" width={1024} height={1536} priority />
      </span>
    </button>}
  </>;
}
