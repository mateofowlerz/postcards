"use client";

import { PostcardFront, PostcardViewer } from "./postcard-viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { MAX_QUERY_LENGTH, normalizeQuery, type PostcardPage } from "@/lib/postcards";

async function fetchPage(url: string): Promise<PostcardPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Couldn’t load postcards. Please try again.");
  return response.json();
}

export function PostcardGallery({ initialQuery, initialPage }: { initialQuery: string; initialPage: PostcardPage }) {
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  const search = useCallback((value: string) => {
    const next = normalizeQuery(value);
    setQuery(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("q", next);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => search(draft), 250);
    return () => window.clearTimeout(timer);
  }, [draft, search]);

  useEffect(() => {
    function restoreSearch() {
      const value = normalizeQuery(new URLSearchParams(window.location.search).get("q") ?? "");
      setDraft(value);
      setQuery(value);
    }
    window.addEventListener("popstate", restoreSearch);
    return () => window.removeEventListener("popstate", restoreSearch);
  }, []);

  return (
    <>
      <header className="gallery-header">
        <h1>Postcards</h1>
        <form role="search" onSubmit={(event) => { event.preventDefault(); search(draft); }}>
          <label className="search-field">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
            <span className="sr-only">Search by place</span>
            <input type="search" name="q" placeholder="Search by place" autoComplete="off" maxLength={MAX_QUERY_LENGTH} value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
        </form>
      </header>
      <GalleryResults key={query} query={query} initialPage={query === initialQuery ? initialPage : undefined} />
    </>
  );
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
    { fallbackData: initialPage ? [initialPage] : undefined, revalidateFirstPage: false, revalidateOnFocus: false, shouldRetryOnError: false },
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
        {cards.map((card) => (
          <li className="postcard-tile" key={card.id} data-postcard-id={card.id}>
            <button type="button" className="postcard-open" style={{ visibility: selected?.id === card.id ? "hidden" : undefined }} aria-label="Turn over the Bogliasco postcard" aria-haspopup="dialog" onClick={event => setSelected({ trigger: event.currentTarget, id: card.id })}>
              <PostcardFront />
            </button>
          </li>
        ))}
      </ul>
      <div className="gallery-status" ref={sentinel}>
        <p role="status" aria-live="polite">
          {error ? "Couldn’t load postcards." : !data ? "Finding postcards…" : cards.length === 0 ? `No postcards found for “${query}”.` : `${cards.length} of ${data[0].total} postcards`}
        </p>
        {error ? <button type="button" onClick={() => void mutate()}>Try again</button> : hasMore ? (
          <button type="button" onClick={() => void loadMore()} disabled={loading}>{loading ? "Loading…" : "Load more"}</button>
        ) : null}
      </div>
      {selected ? <PostcardViewer trigger={selected.trigger} onClose={closePostcard} /> : null}
    </section>
  );
}
