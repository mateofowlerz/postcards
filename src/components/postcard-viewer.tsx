"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useRef } from "react";

export function PostcardFront() {
  return <Image src="/images/bogliasco-front.jpg" width={1551} height={984}
    alt="Bogliasco on the Italian Riviera, vintage postcard from 1900."
    sizes="(max-width: 599px) 46vw, (max-width: 999px) 30vw, (max-width: 1599px) 23vw, 18vw"
    className="grid-postcard-front" />;
}

export function PostcardViewer({ trigger, onClose }: { trigger: HTMLButtonElement; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shuttle = useRef<HTMLDivElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const origin = useRef("");
  const reduced = useRef(false);

  const dismiss = useCallback(async () => {
    if (closing.current || !shuttle.current || !flip.current || !shade.current) return;
    closing.current = true;
    const duration = reduced.current ? 0 : 220;
    // Read the current animated pose so Escape can interrupt the entrance smoothly.
    const from = getComputedStyle(shuttle.current).transform;
    const rotation = getComputedStyle(flip.current).transform;
    const opacity = getComputedStyle(shade.current).opacity;
    for (const element of [shuttle.current, flip.current, shade.current]) {
      element.getAnimations().forEach(animation => animation.cancel());
    }
    const options: KeyframeAnimationOptions = { duration, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" };
    const animations = [
      shuttle.current.animate([{ transform: from }, { transform: origin.current }], options),
      flip.current.animate([{ transform: rotation }, { transform: "rotateY(0deg)" }], options),
      shade.current.animate([{ opacity }, { opacity: 0 }], options),
    ];
    await Promise.allSettled(animations.map(animation => animation.finished));
    onClose();
  }, [onClose]);

  useLayoutEffect(() => {
    const modal = dialog.current!;
    const moving = shuttle.current!;
    const turning = flip.current!;
    const backdrop = shade.current!;
    const source = trigger.getBoundingClientRect();
    const oldOverflow = document.documentElement.style.overflow;
    const oldGutter = document.documentElement.style.scrollbarGutter;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.style.scrollbarGutter = "stable";
    document.documentElement.style.overflow = "hidden";
    modal.showModal();
    const destination = moving.getBoundingClientRect();
    origin.current = `translate(${source.left - destination.left}px, ${source.top - destination.top}px) scale(${source.width / destination.width}, ${source.height / destination.height})`;
    const options: KeyframeAnimationOptions = { duration: reduced.current ? 0 : 300, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" };
    const animations = [
      moving.animate([{ transform: origin.current }, { transform: "translate(0, 0) scale(1)" }], options),
      turning.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], options),
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], options),
    ];
    const handleResize = () => { void dismiss(); };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      animations.forEach(animation => animation.cancel());
      modal.close();
      document.documentElement.style.overflow = oldOverflow;
      document.documentElement.style.scrollbarGutter = oldGutter;
      requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
    };
  }, [trigger, dismiss]);

  return (
    <dialog ref={dialog} className="postcard-dialog" aria-label="Back of the Bogliasco postcard"
      onKeyDown={event => {
        if (event.key === "Tab") {
          event.preventDefault();
          dialog.current?.querySelector<HTMLButtonElement>(".postcard-dialog-close")?.focus();
        }
      }}
      onCancel={event => { event.preventDefault(); void dismiss(); }}>
      <div className="postcard-dialog-shade" ref={shade} onClick={() => void dismiss()} aria-hidden="true" />
      <button className="postcard-dialog-close" type="button" aria-label="Close postcard" onClick={() => void dismiss()} autoFocus>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <div className="postcard-shuttle" ref={shuttle}>
        <div className="postcard-flip" ref={flip}>
          <div className="postcard-face postcard-face-front" aria-hidden="true">
            <Image src="/images/bogliasco-front.jpg" alt="" width={1551} height={984} sizes="(max-width: 768px) 92vw, 720px" loading="eager" />
          </div>
          <div className="postcard-face postcard-face-back">
            <Image src="/images/bogliasco-back.jpg" alt="The original handwritten back of the 1900 Bogliasco postcard, with its Italian postage stamp and postmarks." width={1545} height={978} sizes="(max-width: 768px) 92vw, 720px" loading="eager" />
          </div>
        </div>
      </div>
    </dialog>
  );
}
