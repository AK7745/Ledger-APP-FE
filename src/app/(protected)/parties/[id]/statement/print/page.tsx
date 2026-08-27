'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { BusinessProfile, Statement } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { BRAND, amountInWords, longDate } from '@/lib/brand';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PrintBar } from '@/components/documents';
import {
  BrandDoc, BrandFooter, DetailsGrid, DocTitle, Filler, GrandTotalBar, HeadSpacer,
  LABEL, PAGE_TOP_GAP, PartyBlock, ROW, TD, TD_DENSE, TH, TotalRow,
} from '@/components/brand-doc';

const TYPE_LABEL: Record<string, string> = {
  INVOICE: 'Invoice',
  BILL: 'Bill',
  PAYMENT_IN: 'Payment received',
  PAYMENT_OUT: 'Payment made',
};

export default function StatementPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<Statement | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Statement>(`parties/${id}/statement`).then(setS);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  useDocumentTitle(s ? `Statement - ${s.party.name}` : null);

  if (!s) return <p className="text-muted">Loading…</p>;

  const currency = profile?.defaultCurrency ?? 'PKR';
  const net = Number(s.summary.netBalance);
  // Statements run long, so rows stay tight throughout.
  const cell = s.entries.length > 9 ? TD_DENSE : TD;
  const first = s.entries[0]?.date;
  const last = s.entries[s.entries.length - 1]?.date;

  return (
    <div>
      <PrintBar backHref={`/parties/${id}/statement`} />

      <BrandDoc docRef={`STATEMENT · ${s.party.name}`} profile={profile}>
        <DocTitle title="STATEMENT OF ACCOUNT" tag="ORIGINAL FOR RECIPIENT" />

        <div
          style={{
            padding: '26px 46px 0',
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 32,
          }}
        >
          <PartyBlock label="ACCOUNT" party={s.party} />
          <DetailsGrid
            rows={[
              ['Statement date', longDate(new Date().toISOString())],
              first ? ['Period from', longDate(first)] : null,
              last ? ['Period to', longDate(last)] : null,
              ['Entries', String(s.entries.length)],
            ]}
          />
        </div>

        <div style={{ padding: '0 46px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
            <thead>
              <HeadSpacer colSpan={6} />
              <tr style={{ background: BRAND.navy, color: BRAND.paper }}>
                <th style={{ ...TH, textAlign: 'left', width: 92 }}>Date</th>
                <th style={{ ...TH, textAlign: 'left', width: 96 }}>Ref.</th>
                <th style={{ ...TH, textAlign: 'left' }}>Description</th>
                <th style={{ ...TH, textAlign: 'right', width: 88 }}>Debit</th>
                <th style={{ ...TH, textAlign: 'right', width: 88 }}>Credit</th>
                <th style={{ ...TH, textAlign: 'right', width: 96 }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {s.entries.map((e, i) => (
                <tr
                  key={`${e.ref ?? e.type}-${i}`}
                  style={{
                    ...ROW,
                    borderBottom: `1px solid ${BRAND.line}`,
                    background: i % 2 ? BRAND.zebra : undefined,
                  }}
                >
                  <td style={{ ...cell, color: BRAND.body, whiteSpace: 'nowrap' }}>
                    {formatDate(e.date)}
                  </td>
                  <td style={{ ...cell, fontWeight: 600 }}>{e.ref ?? '—'}</td>
                  <td style={{ ...cell, color: BRAND.body }}>
                    {e.description || TYPE_LABEL[e.type] || e.type}
                    {e.pending && (
                      <span style={{ color: BRAND.brass, fontWeight: 600 }}> · pending</span>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {Number(e.debit) ? money(e.debit) : ''}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {Number(e.credit) ? money(e.credit) : ''}
                  </td>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>
                    {money(e.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={LABEL}>NOTES</div>
              <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body }}>
                A positive balance is owed to New Diamond Corporation; a negative balance is
                owed by us. Pending instruments are shown but do not affect the balance until
                they clear.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TotalRow label="Total invoiced" value={money(s.summary.totalInvoiced)} />
            <TotalRow label="Total received" value={money(s.summary.totalPaid)} zebra />
            {Number(s.summary.totalBilled) > 0 && (
              <TotalRow label="Total billed to us" value={money(s.summary.totalBilled)} />
            )}
            {Number(s.summary.totalPaidOut) > 0 && (
              <TotalRow label="Total paid out" value={money(s.summary.totalPaidOut)} zebra />
            )}
            {Number(s.summary.totalPending) > 0 && (
              <TotalRow label="Pending (uncleared)" value={money(s.summary.totalPending)} />
            )}
            <GrandTotalBar
              // Kept short: a long label wraps inside the bar and forces the
              // amount to wrap with it.
              label={net > 0 ? 'BALANCE DUE' : net < 0 ? 'WE OWE' : 'SETTLED'}
              value={`${currency} ${money(Math.abs(net))}`}
            />
            <div style={{ padding: '7px 10px', fontSize: 9, color: BRAND.greyLight }}>
              Amount in words: {amountInWords(Math.abs(net), currency)}
            </div>
          </div>
        </div>

        <Filler />
        <BrandFooter right="FOR NEW DIAMOND CORPORATION" note="THANK YOU FOR YOUR BUSINESS" />
      </BrandDoc>
    </div>
  );
}
