'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type QueryState = Record<string, string>;

const EMPTY: Record<string, string> = {};

/**
 * List filter state, held in the URL rather than component state.
 *
 * Keeping it in the query string means back/forward works, a filtered view can
 * be bookmarked or shared, and a page refresh does not silently reset what you
 * were looking at. `router.replace` is used so filtering does not push a history
 * entry per keystroke.
 *
 * Callers must render inside <Suspense> — useSearchParams opts the tree into
 * client rendering (see the Next 16 notes in CLAUDE.md).
 */
export function useListQuery(
  allowed: readonly string[],
  /**
   * Merged into the API query but not counted as user-set filters (e.g. page).
   * Must be a stable reference — declare it as a module-level constant, not an
   * object literal in the component, or the query recomputes every render.
   */
  defaults: Record<string, string> = EMPTY,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo(() => {
    const out: QueryState = {};
    for (const key of allowed) {
      const v = searchParams.get(key);
      if (v) out[key] = v;
    }
    return out;
    // searchParams is a stable snapshot per navigation.
  }, [searchParams, allowed]);

  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      // Changing any filter returns to page 1 — staying on page 7 of a result
      // set that just shrank to two pages shows an empty table.
      if (!('page' in patch)) next.delete('page');
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  /** Query string to hand the API — same keys, so there is one source of truth. */
  const apiQuery = useMemo(() => {
    const qs = new URLSearchParams({ ...defaults, ...value }).toString();
    return qs ? `?${qs}` : '';
  }, [value, defaults]);

  // Paging keys are machinery, not filters — they must not show up in "Clear (n)".
  const activeCount = Object.keys(value).filter((k) => !(k in defaults)).length;

  return { value, set, reset, apiQuery, activeCount };
}
