'use client';

import { useEffect, useRef, useState } from 'react';
import { Input, Select } from '@/components/ui';

/**
 * Search box that reports upward on a debounce, so a filtered list does not
 * refetch on every keystroke. Local state keeps typing responsive; the URL (and
 * therefore the request) only follows once typing pauses.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  delay = 300,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [text, setText] = useState(value);
  const latest = useRef(value);

  // Adopt external changes (back button, Clear) without clobbering typing.
  useEffect(() => {
    if (value !== latest.current) {
      latest.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text === latest.current) return;
    const t = setTimeout(() => {
      latest.current = text;
      onChange(text);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay, onChange]);

  return (
    <div className="relative min-w-[220px] flex-1">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="!mt-0 pr-8"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-muted hover:bg-hover hover:text-fg"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  full,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  label: string;
  /** Fill the container — used inside the filter panel, where rows are stacked. */
  full?: boolean;
}) {
  return (
    <div className={full ? 'w-full' : 'w-44 shrink-0'}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="!mt-0"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** A filter that is either on or off — rendered as a toggle chip, not a select. */
export function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-line ${
        active ? 'bg-accent text-white ring-transparent' : 'text-muted hover:bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (patch: { from?: string; to?: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value })}
          aria-label="From date"
          className="!mt-0"
        />
      </div>
      <span className="text-sm text-muted">to</span>
      <div className="min-w-0 flex-1">
        <Input
          type="date"
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
          aria-label="To date"
          className="!mt-0"
        />
      </div>
    </div>
  );
}

export function AmountRange({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (patch: { minAmount?: string; maxAmount?: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          type="number"
          inputMode="decimal"
          value={min}
          onChange={(e) => onChange({ minAmount: e.target.value })}
          placeholder="Min amount"
          aria-label="Minimum amount"
          className="!mt-0"
        />
      </div>
      <span className="text-sm text-muted">–</span>
      <div className="min-w-0 flex-1">
        <Input
          type="number"
          inputMode="decimal"
          value={max}
          onChange={(e) => onChange({ maxAmount: e.target.value })}
          placeholder="Max amount"
          aria-label="Maximum amount"
          className="!mt-0"
        />
      </div>
    </div>
  );
}

/** A labelled row inside the filter panel. */
export function PanelField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}

/**
 * Compact filter toolbar: a search box plus a single "Filters" button that opens
 * a popover holding every other filter.
 *
 * Choices inside the popover are held as DRAFT state and only written to the URL
 * on Apply, so half-built filter combinations never trigger a fetch, and
 * dismissing the panel discards them. `children` is a render prop receiving the
 * draft and a setter.
 */
export function FilterBar({
  fields,
  value,
  onApply,
  onReset,
  search,
  children,
}: {
  /** Query keys this panel owns — used for the badge count and for Apply. */
  fields: readonly string[];
  value: Record<string, string>;
  onApply: (patch: Record<string, string | undefined>) => void;
  onReset: () => void;
  search?: React.ReactNode;
  children: (
    draft: Record<string, string>,
    setDraft: (patch: Record<string, string | undefined>) => void,
  ) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraftState] = useState<Record<string, string>>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  const applied = fields.filter((f) => value[f]).length;
  const activeTotal = Object.keys(value).length;

  // Seeding the draft happens on open (an event handler), not in an effect, so
  // there is no cascading render.
  function openPanel() {
    const seed: Record<string, string> = {};
    for (const f of fields) if (value[f]) seed[f] = value[f];
    setDraftState(seed);
    setOpen(true);
  }

  function setDraft(patch: Record<string, string | undefined>) {
    setDraftState((d) => {
      const next = { ...d };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') delete next[k];
        else next[k] = v;
      }
      return next;
    });
  }

  function apply() {
    // Every managed field is sent, so cleared ones are actively removed.
    const patch: Record<string, string | undefined> = {};
    for (const f of fields) patch[f] = draft[f];
    onApply(patch);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {search}

      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ring-1 ring-line ${
            applied > 0 ? 'bg-accent text-white ring-transparent' : 'text-fg hover:bg-hover'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M4.5 8h7M7 12h2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Filters
          {applied > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 text-xs">{applied}</span>
          )}
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Filters"
            // Anchored to the button's right edge: the search box is flex-1, so the
            // button sits at the right of the toolbar and a left-anchored
            // panel would overflow the viewport.
            className="absolute right-0 z-30 mt-2 w-[22rem] rounded-xl bg-surface p-4 shadow-lg ring-1 ring-line"
          >
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              {children(draft, setDraft)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setDraftState({})}
                className="text-sm text-muted hover:text-fg hover:underline"
              >
                Clear filters
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-fg ring-1 ring-line hover:bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTotal > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-fg"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Page controls. Renders nothing for a single page — pagination chrome on a
 * 6-row table is noise.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  onPageSize,
  noun,
  busy,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  noun: string;
  /** A re-fetch is in flight — the rows on screen are from the previous query. */
  busy?: boolean;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {total === 0 ? `No ${noun}` : `${first}–${last} of ${total} ${noun}`}
        {busy ? ' · updating…' : ''}
      </p>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          Per page
          <div className="w-20">
            <Select
              value={String(pageSize)}
              onChange={(e) => onPageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="!mt-0"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </label>

        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => onPage(page - 1)} disabled={page <= 1}>
              ← Prev
            </PageBtn>
            <span className="px-2 text-sm text-muted">
              Page {page} of {pageCount}
            </span>
            <PageBtn onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
              Next →
            </PageBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function PageBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-fg ring-1 ring-line hover:bg-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
