'use client';

import Link from 'next/link';
import type { BusinessProfile } from '@/lib/types';

export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print mb-4 flex items-center justify-between">
      <Link href={backHref} className="text-sm text-muted underline">
        ← Back
      </Link>
      <button
        onClick={() => window.print()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Print / Save as PDF
      </button>
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
