"use client";

import { PostcardFront, PostcardViewer } from "./postcard-viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { isPortrait, type PostcardPage } from "@/lib/postcards";

async function fetchPage(url: string): Promise<PostcardPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Couldn’t load postcards. Please try again.");
  return response.json();
}

export function PostcardGallery({ initialQuery, initialPage }: { initialQuery: string; initialPage: PostcardPage }) {
  return <GalleryResults key={initialQuery} query={initialQuery} initialPage={initialPage} />;
}

function GalleryResults({ query, initialPage }: { query: string; initialPage?: PostcardPage }) {
  const [selected, setSelected] = useState<{ trigger: HTMLButtonElement; id: number } | null>(null);
  const closePostcard = useCallback(() => setSelected(null), []);
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite<PostcardPage>(
    (index, previous: PostcardPage | null) => {
      if (previous && previous.nextCursor === null) return null;
      const params = new URLSearchParams({ q: query, cursor: String(index === 0 ? 0 : previous!.nextCursor) });
      return `/api/postcards?${params}`;
    },
    fetchPage,
    { fallbackData: initialPage ? [initialPage] : undefined, revalidateFirstPage: true, revalidateOnFocus: true, shouldRetryOnError: false },
  );
  const cards = data?.flatMap((page) => page.items) ?? [];
  const hasMore = data ? data.at(-1)!.nextCursor !== null : false;
  const loading = !data || isValidating || data.length < size;

  const loadMore = useCallback(async () => {
    if (inFlight.current || loading || !hasMore || error) return;
    inFlight.current = true;
    try { await setSize((current) => current + 1); }
    finally { inFlight.current = false; }
  }, [loading, hasMore, error, setSize]);

  useEffect(() => {
    if (!sentinel.current || !hasMore || error || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: "400px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, error]);

  return (
    <section aria-label="Postcard collection" aria-busy={loading && !error}>
      <ul className="postcard-grid">
        {cards.map((card, index) => (
          <li className={`postcard-tile ${index > 0 && isPortrait(card) && !isPortrait(cards[index - 1]) ? "postcard-orientation-start" : ""}`} key={card.id} data-postcard-id={card.id}>
            <button type="button" className="postcard-open" style={{ visibility: selected?.id === card.id ? "hidden" : undefined }} aria-label={`Write a postcard: ${card.title}`} aria-haspopup="dialog" onClick={event => setSelected({ trigger: event.currentTarget, id: card.id })}>
              <PostcardFront card={card} />
            </button>
          </li>
        ))}
      </ul>
      <div className="gallery-status" ref={sentinel}>
        <p role="status" aria-live="polite">
          {error ? "Couldn’t load postcards." : !data ? "Finding postcards…" : cards.length === 0 ? `No postcards found for “${query}”.` : ""}
        </p>
        {error ? <button type="button" onClick={() => void mutate()}>Try again</button> : hasMore ? (
          <button type="button" onClick={() => void loadMore()} disabled={loading}>{loading ? "Loading…" : "Load more"}</button>
        ) : null}
      </div>
      {selected ? <PostcardViewer card={cards.find(card => card.id === selected.id)!} trigger={selected.trigger} onClose={closePostcard} /> : null}
    </section>
  );
}






