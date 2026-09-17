"use client";
import { useRef, useState, type ReactNode } from 'react';
import { PostcardViewer } from './postcard-viewer';

const card = { id: 0, title: 'Split Rock', place: 'Lake Harmony, Pennsylvania', imageUrl: '/images/split-rock-postcard.png', width: 2064, height: 2620 };

export function WelcomePhoto({ children }: { children: ReactNode }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return <>
    <button ref={trigger} className="welcome-photo-open" type="button" aria-label="Write a Split Rock postcard" aria-haspopup="dialog" onClick={() => setOpen(true)}>{children}</button>
    {open && <PostcardViewer card={card} trigger={trigger.current!} onClose={() => setOpen(false)} />}
  </>;
}
