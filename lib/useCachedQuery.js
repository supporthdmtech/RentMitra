"use client";

import { useEffect, useState } from "react";

// Every tab currently re-fetches everything from scratch on each visit and
// blocks on a "Loading…" screen while it does — revisiting Home after
// checking Payments feels slow even though nothing changed. This is a tiny
// stale-while-revalidate cache: a page's last-fetched result is kept in a
// module-level Map for the session, so returning to a tab you've already
// visited renders instantly with the cached data while quietly refetching
// in the background. Only a genuinely first-ever visit shows the spinner.
const cache = new Map();

export function useCachedQuery(key, fetcher, deps = []) {
  const cached = cache.get(key);
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    fetcher().then((result) => {
      if (cancelled) return;
      cache.set(key, result);
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, setData };
}
