'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { BusinessProfile } from '@/lib/types';

/**
 * Print toolbar. When the page passes `onStampChange`, the button becomes a
 * split control: the main half prints as-is, the caret opens a menu offering
 * the company stamp on the signature line.
 */
export function PrintBar({
  backHref,
  onStampChange,
}: {
  backHref: string;
  /** Omit on documents that must never be stamped (e.g. the purchase bill). */
  onStampChange?: (withStamp: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Same dismissal behaviour as the filter popover: click-outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function print(withStamp: boolean) {
    setOpen(false);
    // flushSync, not a bare setState: window.print() snapshots the DOM
    // synchronously, so a pending React update would print the previous state
    // and the stamp would appear only on the *next* print.
    if (onStampChange) flushSync(() => onStampChange(withStamp));
    window.print();
  }

  const btn = 'bg-accent text-sm font-medium text-white hover:bg-accent-hover';

  return (
    <div className="no-print mb-4 flex items-center justify-between">
      <Link href={backHref} className="text-sm text-muted underline">
        ← Back
      </Link>

      {onStampChange ? (
        <div ref={wrapRef} className="relative flex items-stretch">
          <button onClick={() => print(false)} className={`${btn} rounded-l-md px-4 py-2`}>
            Print / Save as PDF
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Print options"
            aria-expanded={open}
            className={`${btn} ml-px rounded-r-md px-2 py-2`}
          >
            <span aria-hidden>▾</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-md bg-surface py-1 shadow-lg ring-1 ring-line">
              <button
                onClick={() => print(true)}
                className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-hover"
              >
                Print with stamp
              </button>
              <button
                onClick={() => print(false)}
                className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-hover"
              >
                Print without stamp
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => window.print()} className={`${btn} rounded-md px-4 py-2`}>
          Print / Save as PDF
        </button>
      )}
    </div>
  );
}

export function BusinessHeaderBlock({ profile }: { profile: BusinessProfile | null }) {
  return (
    <div>
      {profile?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.logoUrl} alt="" className="mb-2 h-12 object-contain" />
      )}
      <div className="text-lg font-semibold text-fg">
        {profile?.businessName ?? 'Your Business'}
      </div>
      {profile?.address && (
        <div className="whitespace-pre-wrap text-sm text-muted">{profile.address}</div>
      )}
      {(profile?.phone || profile?.email) && (
        <div className="text-sm text-muted">
          {[profile?.phone, profile?.email].filter(Boolean).join(' · ')}
        </div>
      )}
      {profile?.taxNumber && (
        <div className="text-sm text-muted">Tax #: {profile.taxNumber}</div>
      )}
    </div>
  );
}

// A4-ish white sheet for documents.
export function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-surface p-10 shadow-sm ring-1 ring-line print:max-w-none print:p-0 print:shadow-none print:ring-0">
      {children}
    </div>
  );
}
