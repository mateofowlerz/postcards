"use client";

import Image from "next/image";
import { stamps } from "@/lib/stamps";
import patterns from '@/lib/patterns.json';
import patternMatches from '@/lib/pattern-matches.json';
import type { Postcard } from "@/lib/postcards";
import type { PlacedStamp, PostcardDraft } from '@/lib/shared-postcard';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type { PostcardDraft } from '@/lib/shared-postcard';

export function PostcardFront({ card }: { card: Postcard }) {
  const [left, top, right, bottom] = card.crop ?? [0, 0, 0, 0];
  const width = card.width - left - right;
  const height = card.height - top - bottom;
  return <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: `${width} / ${height}` }}>
    <Image src={card.imageUrl} width={card.width} height={card.height} alt={card.title}
      sizes="(max-width: 599px) 92vw, (max-width: 999px) 720px, 720px" className="grid-postcard-front"
      style={{ position: 'absolute', maxWidth: 'none', width: `${card.width / width * 100}%`, left: `${-left / width * 100}%`, top: `${-top / height * 100}%` }} />
  </div>;
}
export function PostcardViewer({ card, trigger, onClose, receivedDraft }: { card: Postcard; trigger?: HTMLButtonElement; onClose: () => void; receivedDraft?: PostcardDraft }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const addressField = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState(receivedDraft?.message ?? '');
  const [address, setAddress] = useState(receivedDraft?.address ?? '');
  const [saveError, setSaveError] = useState('');
  const [stampId, setStampId] = useState(receivedDraft?.stampId ?? '');
  const [placedStamps, setPlacedStamps] = useState<PlacedStamp[]>(receivedDraft?.stamps ?? (receivedDraft?.stampId ? [{ id: receivedDraft.stampId, x: 82.5, y: 20 }] : []));
  const placedStampsRef = useRef(placedStamps);
  placedStampsRef.current = placedStamps;
  const stampWasDragged = useRef(false);
  const [selectedStampIndex, setSelectedStampIndex] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const [showBack, setShowBack] = useState(false);
  const [mailing, setMailing] = useState(false);
  async function createLink() {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setShareLink('');
    setShareStatus('saving your postcard…');
    const matches = (patternMatches as Record<string, number[]>)[String(card.id)] ?? patterns.map((_, index) => index);
    const patternIndex = matches[Math.floor(Math.random() * matches.length)];
    const payload = { id: card.id, message, address, stampId, stamps: placedStamps, patternIndex };
    try {
      const response = await fetch('/api/share', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Sharing failed');
      const { path } = await response.json();
      // Use the origin that saved the postcard, including local and preview environments.
      const link = new URL(path, window.location.origin).href;
      setShareLink(link);
      setMailing(true);
      if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
        setShareStatus('local preview link — publish the site before sending it.');
        return;
      }
      try { await navigator.clipboard.writeText(link); setShareStatus('link copied.'); }
      catch { setShareStatus('copy the link below.'); }
    } catch {
      setShareStatus('your link could not be saved. please try again.');
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }
  const [stampPickerOpen, setStampPickerOpen] = useState(false);
  const storageKey = `postcard-draft-${card.id}`;

  function persist(nextMessage = message, nextAddress = address, nextStamps = placedStamps) {
    localStorage.setItem(storageKey, JSON.stringify({ message: nextMessage, address: nextAddress, stampId: nextStamps[0]?.id ?? '', stamps: nextStamps }));
  }

  useEffect(() => {
    if (receivedDraft) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved);
        setStampId(typeof draft.stampId === 'string' ? draft.stampId : '');
        setPlacedStamps(Array.isArray(draft.stamps) ? draft.stamps : draft.stampId ? [{ id: draft.stampId, x: 82.5, y: 20 }] : []);
        setMessage(typeof draft.message === 'string' ? draft.message : '');
        setAddress(typeof draft.address === 'string' ? draft.address : '');
      }
    } catch { setSaveError('Browser storage is unavailable. Keep this postcard open to retain your message.'); }
  }, [storageKey, receivedDraft]);

  function save(nextMessage: string, nextAddress: string) {
    setMessage(nextMessage);
    setAddress(nextAddress);
    try {
      persist(nextMessage, nextAddress);
      setSaveError('');
    } catch { setSaveError('Your message could not be saved in this browser.'); }
  }

  useLayoutEffect(() => {
    const modal = dialog.current!;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    modal.showModal();
    modal.scrollTop = 0;
    modal.focus({ preventScroll: true });
    return () => {
      modal.close();
      document.documentElement.style.overflow = overflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [trigger]);

  useLayoutEffect(() => {
    function fit() {
      for (const field of [messageField.current, addressField.current]) {
        if (!field || !field.clientHeight) continue;
        let low = 0.1;
        let high = Math.min(13, Math.max(10, field.parentElement!.clientWidth * .018));
        field.style.fontSize = `${high}px`;
        if (field.scrollHeight <= field.clientHeight && field.scrollWidth <= field.clientWidth) continue;
        for (let step = 0; step < 12; step++) {
          const size = (low + high) / 2;
          field.style.fontSize = `${size}px`;
          if (field.scrollHeight <= field.clientHeight && field.scrollWidth <= field.clientWidth) low = size;
          else high = size;
        }
        field.style.fontSize = `${low}px`;
        field.scrollTop = 0;
      }
    }
    fit();
    const observer = new ResizeObserver(fit);
    if (messageField.current?.parentElement) observer.observe(messageField.current.parentElement);
    document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [message, address, showBack]);

  function positionStamp(index: number, event: ReactPointerEvent<HTMLButtonElement>, savePosition = false) {
    if (receivedDraft || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.parentElement!.getBoundingClientRect();
    const next = placedStampsRef.current.map((stamp, stampIndex) => stampIndex === index ? { ...stamp, x: Math.max(0, Math.min(84, (event.clientX - rect.left) / rect.width * 100 - 8)), y: Math.max(0, Math.min(73, (event.clientY - rect.top) / rect.height * 100 - 13.5)) } : stamp);
    placedStampsRef.current = next;
    setPlacedStamps(next);
    if (savePosition) try { persist(message, address, next); } catch {}
  }
  function endStampDrag(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    positionStamp(index, event, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function deletePlacedStamp(index: number) {
    const next = placedStampsRef.current.filter((_, stampIndex) => stampIndex !== index);
    placedStampsRef.current = next; setPlacedStamps(next); setSelectedStampIndex(null); setStampId(next[0]?.id ?? '');
    try { persist(message, address, next); setSaveError(''); } catch { setSaveError('Your stamp change could not be saved.'); }
  }
  useEffect(() => {
    if (receivedDraft || selectedStampIndex === null) return;
    function removeSelectedStamp(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      event.preventDefault();
      deletePlacedStamp(selectedStampIndex!);
      setStampPickerOpen(false);
    }
    window.addEventListener('keydown', removeSelectedStamp);
    return () => window.removeEventListener('keydown', removeSelectedStamp);
  }, [selectedStampIndex, receivedDraft, message, address]);

  const receivedPattern = receivedDraft ? patterns[receivedDraft.patternIndex ?? Math.abs(card.id) % patterns.length] : undefined;
  const visibleWidth = card.width - (card.crop?.[0] ?? 0) - (card.crop?.[2] ?? 0);
  const visibleHeight = card.height - (card.crop?.[1] ?? 0) - (card.crop?.[3] ?? 0);
  const receivedPortrait = !!receivedDraft && visibleHeight > visibleWidth;
  const receivedAspect = receivedPortrait ? visibleHeight / visibleWidth : visibleWidth / visibleHeight;
  return <dialog ref={dialog} tabIndex={-1} className={`postcard-composer-dialog ${receivedDraft ? 'received-postcard' : ''} ${receivedPortrait ? 'received-portrait' : ''}`} style={receivedPattern ? { '--received-pattern': `url(${receivedPattern.imageUrl})`, '--portrait-ratio': visibleWidth / visibleHeight, '--received-aspect': receivedAspect } as CSSProperties : undefined} aria-label={`Write a postcard: ${card.title}`}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
      const target = event.target as Element;
      if (!target.closest('.postcard-writing-back, .postcard-composer-front, .postcard-stamp-picker, .postcard-share')) onClose();
    }}>
    <div className={`postcard-composer ${receivedDraft && showBack ? 'show-back' : ''}`}>
      <div className="postcard-composer-front" hidden={false} role={receivedDraft ? 'button' : undefined} tabIndex={receivedDraft ? 0 : undefined} aria-label={receivedDraft ? 'Turn postcard over' : undefined} onClick={() => { if (receivedDraft) setShowBack(true); }} onKeyDown={event => { if (receivedDraft && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setShowBack(true); } }} style={card.id === 0 ? { aspectRatio: "516 / 331", overflow: "hidden" } : undefined}><PostcardFront card={card} /></div>
      <div className="postcard-back-row" hidden={false}><div className="postcard-writing-back" role={receivedDraft ? 'button' : undefined} tabIndex={receivedDraft ? 0 : undefined} aria-label={receivedDraft ? 'Turn postcard over' : undefined} onClick={() => receivedDraft && setShowBack(false)} onKeyDown={event => { if (receivedDraft && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setShowBack(false); } }}>
        <button type="button" className="postcard-stamp-target" disabled={!!receivedDraft} aria-label="Add another stamp" aria-expanded={stampPickerOpen} onClick={() => { setSelectedStampIndex(null); setStampPickerOpen(open => !open); }} />
        <Image src="/images/writable-postcard-back.png" alt="Vintage postcard back with a stamp box and address lines." width={1339} height={1575} sizes="(max-width: 768px) 92vw, 720px" className="postcard-back-template" />
        {placedStamps.map((placed, index) => { const stamp = stamps.find(item => item.id === placed.id); return stamp ? <button key={`${placed.id}-${index}`} type="button" className={`placed-postcard-stamp ${selectedStampIndex === index ? 'is-selected' : ''}`} disabled={!!receivedDraft} aria-label={`${stamp.title}. Click to replace; press Delete to remove.`} style={{ left: `${placed.x}%`, top: `${placed.y}%` }} onDragStart={event => event.preventDefault()} onPointerDown={event => { event.preventDefault(); stampWasDragged.current = false; setSelectedStampIndex(index); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (event.buttons) stampWasDragged.current = true; positionStamp(index, event); }} onPointerUp={event => endStampDrag(index, event)} onPointerCancel={event => endStampDrag(index, event)} onClick={() => { if (stampWasDragged.current) { stampWasDragged.current = false; return; } setSelectedStampIndex(index); setStampPickerOpen(true); }} onKeyDown={event => { if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deletePlacedStamp(index); } }}>
          <Image src={stamp.imageUrl} alt={stamp.title} className="stamp-art" draggable={false} fill sizes="140px" style={{ objectFit: 'contain' }} />
        </button> : null; })}
        <textarea spellCheck={false} autoCorrect="off" readOnly={!!receivedDraft} ref={messageField} className="postcard-message" aria-label="Your postcard message" placeholder="Write your message…" maxLength={2000} value={message} onChange={event => save(event.target.value, address)} />
        <textarea spellCheck={false} autoCorrect="off" readOnly={!!receivedDraft} ref={addressField} className="postcard-recipient" aria-label="Recipient address" placeholder="Recipient address" maxLength={400} value={address} onChange={event => save(message, event.target.value)} />
      </div>
        {stampPickerOpen && <div className="postcard-stamp-picker" role="region" aria-label="Stamp choices">
          {stamps.length === 0 ? <p>No stamps available yet.</p> : stamps.map(stamp => <div key={stamp.id} className="postcard-stamp-choice"><button type="button" aria-label={stamp.title} onClick={() => {
            const offset = placedStamps.length % 4; const next = selectedStampIndex === null ? [...placedStamps, { id: stamp.id, x: 82 - offset * 5, y: 20 + offset * 4 }] : placedStamps.map((placed, index) => index === selectedStampIndex ? { ...placed, id: stamp.id } : placed); placedStampsRef.current = next; setPlacedStamps(next); setStampId(next[0].id); setSelectedStampIndex(null); setStampPickerOpen(false);
            try { persist(message, address, next); setSaveError(''); }
            catch { setSaveError('Your stamp could not be saved in this browser.'); }
          }}><Image src={stamp.imageUrl} alt={stamp.title} className="stamp-art" width={150} height={180} style={{ objectFit: 'contain' }} /></button>
          </div>)}
        </div>}
      </div>
      {!receivedDraft && <div className="postcard-share">
        <button type="button" disabled={sharing} onClick={() => void createLink()}>{sharing ? 'creating link…' : 'create link'}</button>
        {shareLink && <input aria-label="Postcard share link" readOnly value={shareLink} onFocus={event => event.currentTarget.select()} />}
        <p role="status">{shareStatus}</p>
      </div>}
      {!receivedDraft && <p className="postcard-draft-status" role="status">{saveError || 'Your draft is saved in this browser.'}</p>}
      {mailing && <div className="postcard-mailing" aria-hidden="true" onAnimationEnd={event => { if (event.animationName === 'mail-scene') setMailing(false); }}>
        <div className="mailbox-top"><Image src="/images/mailbox.png" alt="" width={619} height={1200} /></div>
        <div className="mailing-card"><PostcardFront card={card} /></div>
      </div>}
    </div>
  </dialog>;
}



