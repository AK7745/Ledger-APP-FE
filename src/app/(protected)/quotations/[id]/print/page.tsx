'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { BusinessProfile, Party, Quotation } from '@/lib/types';
import { money } from '@/lib/format';
import { BRAND, amountInWords, longDate } from '@/lib/brand';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PrintBar } from '@/components/documents';
import {
  BrandDoc, BrandFooter, DetailsGrid, DocTitle, Filler, GrandTotalBar, HeadSpacer,
  LABEL, MIN_ROWS, PAGE_TOP_GAP, PartyBlock, ROW, TH, TotalRow, cellStyle,
} from '@/components/brand-doc';

export default function QuotationPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState<(Quotation & { party?: Party }) | null>(null);
  // Print-with-stamp is a per-print choice, not a saved preference.
  const [stamp, setStamp] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Quotation & { party?: Party }>(`quotations/${id}`).then(setQ);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  useDocumentTitle(q ? (q.number ?? 'Quotation-DRAFT') : null);

  if (!q) return <p className="text-muted">Loading…</p>;

  const party = q.party as Party | undefined;
  const currency = profile?.defaultCurrency ?? 'PKR';
  // Priced lines carry the money; pending ones are quoted without a rate and
  // get their own block below, out of the totals entirely.
  const priced = q.lines.filter((l) => l.unitPrice !== null);
  const pending = q.lines.filter((l) => l.unitPrice === null);
  // MIN_ROWS padding exists so a short table does not float in white space. That
  // does not apply when a second table follows it — there, blank rows are just
  // noise between real data and the pending block, and they cost line capacity
  // on a sheet that is already carrying an extra table.
  const fillers = pending.length > 0 ? 0 : Math.max(0, MIN_ROWS - priced.length);
  // Row density is one decision for the whole document. Keying it off the priced
  // count alone would render 9 priced + 12 pending at roomy padding and overflow.
  const cell = cellStyle(q.lines.length);
  // `subtotal` is already net of line discounts (lineTotal = qty*price - discount),
  // so the row bridging subtotal -> total is quotationDiscount alone.
  // `discountTotal` is a reporting figure (line + quotation) and would double-count.
  const quotationDiscount = Number(q.quotationDiscount ?? 0);

  return (
    <div>
      <PrintBar backHref={`/quotations/${id}`} onStampChange={setStamp} />

      <BrandDoc docRef={q.number ?? 'DRAFT'} profile={profile}>
        <DocTitle
          title={q.status === 'VOID' ? 'VOID QUOTATION' : 'QUOTATION'}
          tag="ORIGINAL FOR RECIPIENT"
        />

        <div
          style={{
            padding: '26px 46px 0',
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 32,
          }}
        >
          <PartyBlock label="QUOTATION FOR" party={party} />
          <DetailsGrid
            rows={[
              ['Quotation No.', q.number ?? 'DRAFT'],
              ['Date', longDate(q.issueDate)],
              q.validUntil ? ['Valid until', longDate(q.validUntil)] : null,
              q.subject ? ['Subject', q.subject] : null,
            ]}
          />
        </div>

        {priced.length > 0 && (
          <div style={{ padding: '0 46px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <HeadSpacer colSpan={6} />
                <tr style={{ background: BRAND.navy, color: BRAND.paper }}>
                  <th style={{ ...TH, textAlign: 'left', width: 26 }}>#</th>
                  <th style={{ ...TH, textAlign: 'left' }}>Description</th>
                  <th style={{ ...TH, textAlign: 'right', width: 52 }}>Qty</th>
                  <th style={{ ...TH, textAlign: 'right', width: 84 }}>Rate</th>
                  <th style={{ ...TH, textAlign: 'right', width: 76 }}>Discount</th>
                  <th style={{ ...TH, textAlign: 'right', width: 92 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {priced.map((line, i) => (
                  <tr
                    key={line.id ?? i}
                    style={{
                      ...ROW,
                      borderBottom: `1px solid ${BRAND.line}`,
                      background: i % 2 ? BRAND.zebra : undefined,
                    }}
                  >
                    <td style={{ ...cell, color: BRAND.greyLight }}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: 600 }}>{line.description}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{Number(line.qty)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{money(line.unitPrice)}</td>
                    <td style={{ ...cell, textAlign: 'right', color: BRAND.body }}>
                      {money(line.discount)}
                    </td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>
                      {money(line.lineTotal)}
                    </td>
                  </tr>
                ))}
                {Array.from({ length: fillers }, (_, k) => {
                  const i = priced.length + k;
                  return (
                    <tr
                      key={`filler-${k}`}
                      style={{
                        ...ROW,
                        borderBottom: `1px solid ${BRAND.line}`,
                        background: i % 2 ? BRAND.zebra : undefined,
                      }}
                    >
                      <td style={{ ...cell, color: BRAND.greyLight }}>{i + 1}</td>
                      <td style={cell}>&nbsp;</td>
                      <td style={cell}>&nbsp;</td>
                      <td style={cell}>&nbsp;</td>
                      <td style={cell}>&nbsp;</td>
                      <td style={cell}>&nbsp;</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            padding: `${PAGE_TOP_GAP}px 46px 0`,
            display: 'grid',
            gridTemplateColumns: '1fr 250px',
            gap: 32,
            alignItems: 'start',
            breakInside: 'avoid',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {profile?.bankDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={LABEL}>PAYMENT DETAILS</div>
                <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body, whiteSpace: 'pre-wrap' }}>
                  {profile.bankDetails}
                </div>
              </div>
            )}
            {(q.notes || profile?.invoiceFooter) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={LABEL}>NOTES</div>
                <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body, whiteSpace: 'pre-wrap' }}>
                  {[q.notes, profile?.invoiceFooter].filter(Boolean).join('\n')}
                </div>
              </div>
            )}
          </div>

          {/* An all-pending quotation has nothing to total. Printing a navy
              "TOTAL PKR 0.00" bar on one would read as a quote for nothing. */}
          {priced.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <TotalRow label="Subtotal" value={money(q.subtotal)} />
              {quotationDiscount > 0 && (
                <TotalRow label="Quotation discount" value={`- ${money(quotationDiscount)}`} zebra />
              )}
              <GrandTotalBar label="TOTAL" value={`${currency} ${money(q.grandTotal)}`} />
              <div style={{ padding: '7px 10px', fontSize: 9, color: BRAND.greyLight }}>
                Amount in words: {amountInWords(q.grandTotal, currency)}
              </div>
              {pending.length > 0 && (
                <div style={{ padding: '0 10px', fontSize: 9, color: BRAND.brass, fontWeight: 600 }}>
                  Excludes {pending.length} item{pending.length > 1 ? 's' : ''} pending rate — see below.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items quoted without a rate. Deliberately NO Rate/Discount/Amount
            columns — blank money columns read as zeros, which is the opposite of
            what this block means. PAGE_TOP_GAP because it can begin a
            continuation page; give it a different value and pages start at
            visibly different heights. */}
        {pending.length > 0 && (
          <div style={{ padding: `${PAGE_TOP_GAP}px 46px 0`, breakInside: 'avoid' }}>
            <div style={{ ...LABEL, color: BRAND.brass, marginBottom: 8 }}>
              {/* There is no total to be excluded from when nothing is priced. */}
              {priced.length > 0
                ? 'ITEMS PENDING RATE — NOT INCLUDED IN THE TOTAL'
                : 'ITEMS PENDING RATE'}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1.5px solid ${BRAND.navy}`,
                    color: BRAND.navy,
                  }}
                >
                  <th style={{ ...TH, textAlign: 'left', width: 26 }}>#</th>
                  <th style={{ ...TH, textAlign: 'left' }}>Description</th>
                  <th style={{ ...TH, textAlign: 'right', width: 52 }}>Qty</th>
                  <th style={{ ...TH, textAlign: 'left', width: 230 }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((line, i) => (
                  <tr
                    key={line.id ?? i}
                    style={{
                      ...ROW,
                      borderBottom: `1px solid ${BRAND.line}`,
                      background: i % 2 ? BRAND.zebra : undefined,
                    }}
                  >
                    <td style={{ ...cell, color: BRAND.greyLight }}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: 600 }}>{line.description}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{Number(line.qty)}</td>
                    <td style={{ ...cell, color: BRAND.body }}>{line.rateNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 8, fontSize: 9, lineHeight: 1.6, color: BRAND.body }}>
              {priced.length > 0
                ? 'The items above are quoted without rates and are not included in the total. Rates will be confirmed separately.'
                : 'Every item on this quotation is awaiting a rate. Rates will be confirmed separately; no total is quoted at this stage.'}
            </p>
          </div>
        )}

        <Filler />
        <BrandFooter
          stamp={stamp}
          left="ACCEPTED BY · NAME & DATE"
          right="FOR NEW DIAMOND CORPORATION"
        />
      </BrandDoc>
    </div>
  );
}
