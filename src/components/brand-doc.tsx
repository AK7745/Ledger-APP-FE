'use client';

import React from 'react';
import type { BusinessProfile, Party } from '@/lib/types';
import { BRAND } from '@/lib/brand';
import { NewDiamondLogo, NewDiamondMark } from '@/components/brand';

// Any block that can *begin* a continuation page reserves this much space at
// the top, so every page after the first starts at the same height. Give two
// such blocks different values and the pages visibly disagree.
export const PAGE_TOP_GAP = 30;

// Blank rows are padded in so a short document still reads as a ruled ledger
// rather than a table floating in white space.
export const MIN_ROWS = 8;

export const LABEL: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.16em',
  color: BRAND.greyLight,
  fontWeight: 600,
};
export const TH: React.CSSProperties = {
  padding: '9px 8px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  fontSize: 9,
};
export const TD: React.CSSProperties = { padding: '9px 8px' };
// Trade documents routinely run long. Tightening the row rhythm keeps a typical
// order on one sheet instead of orphaning the footer onto a near-empty page 2.
// The threshold must be low enough that the last roomy row count still fits one
// page — at >10, a 10-line invoice took two pages while an 11-line one took one.
export const TD_DENSE: React.CSSProperties = { padding: '4.5px 8px' };
export const DENSE_ABOVE = 9;
export const ROW: React.CSSProperties = { breakInside: 'avoid' };

export function cellStyle(lineCount: number) {
  return lineCount > DENSE_ABOVE ? TD_DENSE : TD;
}

/**
 * The A4 brand sheet: running header, navy rule, letterhead. Everything else
 * is passed as children. Fixed brand colours throughout — a printed document
 * must never follow the app's light/dark theme.
 */
export function BrandDoc({
  docRef,
  profile,
  children,
}: {
  docRef: string;
  profile: BusinessProfile | null;
  children: React.ReactNode;
}) {
  return (
    <div
      className="brand-doc mx-auto flex max-w-[210mm] flex-col print:max-w-none"
      style={{
        background: BRAND.paper,
        color: BRAND.navy,
        fontFamily: 'var(--font-archivo), Archivo, system-ui, sans-serif',
        minHeight: '285mm', // A4 less the 12mm bottom margin of @page brand-doc
      }}
    >
      {/* Chrome paints position:fixed once per printed page — including page 1,
          so this cannot simply be "pages 2+". The opaque letterhead below is
          stacked above it and hides it on page 1. */}
      <div
        className="doc-running-header"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '3.5mm',
          left: 46,
          right: 46,
          textAlign: 'right',
          fontSize: 8.5,
          letterSpacing: '0.14em',
          color: '#B9C0C8',
          zIndex: 0,
        }}
      >
        {docRef}
      </div>

      <div style={{ height: 8, background: BRAND.navy, position: 'relative', zIndex: 1 }} />

      {/* Mark and tagline are fixed brand; the contact block is BusinessProfile. */}
      <div
        style={{
          padding: '24px 46px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 1,
          background: BRAND.paper,
        }}
      >
        <NewDiamondLogo />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            textAlign: 'right',
            fontSize: 9.5,
            lineHeight: 1.45,
            color: BRAND.grey,
          }}
        >
          <div style={{ fontWeight: 600, color: BRAND.navy, letterSpacing: '0.06em' }}>
            {BRAND.tagline}
          </div>
          {profile?.address
            ?.split('\n')
            .filter(Boolean)
            .map((line, i) => <div key={i}>{line}</div>)}
          {(profile?.phone || profile?.email) && (
            <div>{[profile?.phone, profile?.email].filter(Boolean).join(' · ')}</div>
          )}
          {profile?.taxNumber && <div>NTN / Tax No. {profile.taxNumber}</div>}
        </div>
      </div>

      {children}
    </div>
  );
}

export function DocTitle({ title, tag }: { title: string; tag?: string }) {
  return (
    <div style={{ padding: '34px 46px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: `2px solid ${BRAND.navy}`,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.08em' }}>{title}</div>
        {tag && (
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              color: BRAND.brass,
              fontWeight: 600,
            }}
          >
            {tag}
          </div>
        )}
      </div>
    </div>
  );
}

export function PartyBlock({ label, party }: { label: string; party?: Party }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={LABEL}>{label}</div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontSize: 11,
          lineHeight: 1.55,
          color: BRAND.body,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{party?.name}</div>
        {party?.billingAddress
          ?.split('\n')
          .filter(Boolean)
          .map((line, i) => <div key={i}>{line}</div>)}
        {(party?.phone || party?.taxId) && (
          <div>{[party?.phone, party?.taxId].filter(Boolean).join(' · ')}</div>
        )}
      </div>
    </div>
  );
}

export function DetailsGrid({ rows }: { rows: Array<[string, string] | null> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={LABEL}>DETAILS</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '5px 14px',
          fontSize: 11,
          color: BRAND.body,
        }}
      >
        {rows
          .filter((r): r is [string, string] => r !== null)
          .map(([k, v]) => (
            <React.Fragment key={k}>
              <div style={{ color: BRAND.greyLight }}>{k}</div>
              <div style={{ fontWeight: 600, color: BRAND.navy }}>{v}</div>
            </React.Fragment>
          ))}
      </div>
    </div>
  );
}

/** Transparent spacer row. Chrome repeats the whole <thead> on every page, so
 *  this is what guarantees a gap above the header on continuation pages —
 *  @page margins cannot, because the print dialog can override them. */
export function HeadSpacer({ colSpan }: { colSpan: number }) {
  return (
    <tr aria-hidden="true">
      <th
        colSpan={colSpan}
        style={{
          height: PAGE_TOP_GAP,
          padding: 0,
          border: 0,
          background: 'transparent',
        }}
      />
    </tr>
  );
}

export function TotalRow({
  label,
  value,
  zebra,
  strong,
}: {
  label: string;
  value: string;
  zebra?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '7px 10px',
        fontSize: 11,
        color: BRAND.body,
        background: zebra ? BRAND.zebra : undefined,
      }}
    >
      <span style={strong ? { fontWeight: 600, color: BRAND.navy } : undefined}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, color: BRAND.navy }}>{value}</span>
    </div>
  );
}

export function GrandTotalBar({ label, value }: { label: string; value: string }) {
  // The bar is a fixed 250px column, so a large figure (crore-scale PKR) plus a
  // long label wraps and breaks the bar in two. Shrink the figure instead, and
  // never let either half wrap.
  const fontSize = value.length >= 18 ? 13.5 : value.length >= 15 ? 15 : 17;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        padding: '12px 10px',
        marginTop: 6,
        background: BRAND.navy,
        color: BRAND.paper,
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize, fontWeight: 800, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function SignatureLine({ caption }: { caption: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Blank area above the rule — this document gets signed by hand. */}
      <div style={{ height: 42 }} />
      <div style={{ height: 1, background: BRAND.navy }} />
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: BRAND.greyLight }}>
        {caption}
      </div>
    </div>
  );
}

export function BrandFooter({
  left,
  right,
  note = 'THANK YOU FOR YOUR BUSINESS',
}: {
  left?: string;
  right?: string;
  note?: string;
}) {
  return (
    <div
      style={{
        padding: '0 46px 26px',
        marginTop: PAGE_TOP_GAP,
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        breakInside: 'avoid',
      }}
    >
      {(left || right) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          {left ? <SignatureLine caption={left} /> : <div />}
          {right ? <SignatureLine caption={right} /> : <div />}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: 12,
          borderTop: `1px solid ${BRAND.line}`,
        }}
      >
        <div style={{ fontSize: 9, letterSpacing: '0.1em', color: BRAND.greyLight }}>{note}</div>
        <NewDiamondMark />
      </div>
    </div>
  );
}

/** Pushes the footer to the foot of the sheet when there is room. No
 *  min-height: a floor here only bites when space is already scarce, which is
 *  precisely when it must not add any. */
export function Filler() {
  return <div style={{ flex: 1 }} />;
}
