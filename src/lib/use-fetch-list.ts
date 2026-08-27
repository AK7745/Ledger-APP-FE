'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';

/**
 * Fetches a list for the given API path, re-fetching whenever the path changes.
 *
 * Two things it gets right that a naive effect does not:
 *  - **Out-of-order responses.** Filters change fast (a debounced search fires
 *    per pause), so a slow earlier request can resolve after a faster later
 *    one. A request id guard drops anything that is no longer current.
 *  - **No synchronous setState in the effect body**, which would cascade a
 *    render; state is only touched inside the promise callbacks.
 *
 * `loading` is the first load only. `refreshing` covers subsequent re-fetches,
 * so the list can stay on screen instead of flashing empty on every keystroke.
 */
/** The envelope returned when `page` is supplied; see the API's query.helpers. */
interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function isPaged<T>(v: T[] | Paged<T>): v is Paged<T> {
  return !Array.isArray(v) && Array.isArray((v as Paged<T>).items);
}

export function useFetchList<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Omit<Paged<T>, 'items'> | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    api
      .get<T[] | Paged<T>>(path)
      .then((d) => {
        if (id !== reqId.current) return; // superseded
        // The API returns a bare array unless `page` was requested.
        if (isPaged<T>(d)) {
          setData(d.items);
          setMeta({
            total: d.total,
            page: d.page,
            pageSize: d.pageSize,
            pageCount: d.pageCount,
          });
        } else {
          setData(d);
          setMeta(null);
        }
        setError(null);
        setLoadedPath(path);
      })
      .catch((e: unknown) => {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoadedPath(path);
      });
    // `nonce` lets a caller force a re-fetch after a mutation (archive, void)
    // without changing the path.
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data,
    meta,
    error,
    reload,
    loading: loadedPath === null,
    refreshing: loadedPath !== null && loadedPath !== path,
  };
}
