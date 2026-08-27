'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill, BusinessProfile, Invoice, Party, Payment } from '@/lib/types';
import { money } from '@/lib/format';
import { BRAND, amountInWords, longDate } from '@/lib/brand';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PrintBar } from '@/components/documents';
import {
  BrandDoc, BrandFooter, DetailsGrid, DocTitle, Filler, HeadSpacer,
  LABEL, PAGE_TOP_GAP, PartyBlock, ROW, TD, TH,
} from '@/components/brand-doc';

export default function PaymentPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Payment | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  // Allocations carry only invoiceId/billId, so the referenced documents are
  // fetched to print their real numbers instead of a bare "Invoice"/"Bill".
  const [docRefs, setDocRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<Payment>(`payments/${id}`).then(setP);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  useEffect(() => {
    if (!p) return;
    api.get<Party>(`parties/${p.partyId}`).then(setParty).catch(() => {});
    Promise.all(
      p.allocations.map(async (a) => {
        try {
          if (a.invoiceId) {
            const inv = await api.get<Invoice>(`invoices/${a.invoiceId}`);
            return [a.id, inv.number ?? 'Draft invoice'] as const;
          }
          if (a.billId) {
            const b = await api.get<Bill>(`bills/${a.billId}`);
            return [a.id, b.number ?? 'Draft bill'] as const;
          }
        } catch {
          /* fall through to the generic label below */
        }
        return [a.id, a.invoiceId ? 'Invoice' : a.billId ? 'Bill' : '—'] as const;
      }),
    ).then((pairs) => setDocRefs(Object.fromEntries(pairs)));
  }, [p]);

  const isOut = p?.direction === 'OUT';
  useDocumentTitle(p ? (p.number ?? (isOut ? 'Payment-voucher' : 'Receipt')) : null);

  if (!p) return <p className="text-muted">Loading…</p>;

  const currency = profile?.defaultCurrency ?? 'PKR';

  return (
    <div>
      <PrintBar backHref={`/payments/${id}`} />

      <BrandDoc docRef={p.number ?? 'DRAFT'} profile={profile}>
        <DocTitle
          title={
            p.status === 'VOID'
              ? isOut ? 'VOID PAYMENT VOUCHER' : 'VOID RECEIPT'
              : isOut ? 'PAYMENT VOUCHER' : 'RECEIPT'
          }
          tag={isOut ? 'OFFICE COPY' : 'ORIGINAL FOR RECIPIENT'}
        />

        <div
          style={{
            padding: '26px 46px 0',
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 32,
          }}
        >
          <PartyBlock label={isOut ? 'PAID TO' : 'RECEIVED FROM'} party={party ?? undefined} />
          <DetailsGrid
            rows={[
              [isOut ? 'Voucher No.' : 'Receipt No.', p.number ?? 'DRAFT'],
              ['Date', longDate(p.date)],
              p.method ? ['Method', p.method] : null,
              p.reference ? ['Reference', p.reference] : null,
              ['Status', p.status],
              p.clearedAt ? ['Cleared', longDate(p.clearedAt)] : null,
            ]}
          />
        </div>

        {/* The figure is the point of this document, so it gets the navy bar. */}
        <div style={{ padding: '30px 46px 0' }}>
          <div
            style={{
              background: BRAND.navy,
              color: BRAND.paper,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              breakInside: 'avoid',
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>
              {isOut ? 'AMOUNT PAID' : 'AMOUNT RECEIVED'}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>
              {currency} {money(p.amount)}
            </span>
          </div>
          <div style={{ padding: '8px 2px', fontSize: 9, color: BRAND.greyLight }}>
            Amount in words: {amountInWords(p.amount, currency)}
          </div>
          {p.status === 'PENDING' && (
            <div style={{ padding: '2px 2px', fontSize: 10, color: BRAND.brass, fontWeight: 600 }}>
              Not yet cleared — this document confirms receipt of the instrument only.
            </div>
          )}
        </div>

        {p.allocations.length > 0 && (
          <div style={{ padding: '26px 46px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <HeadSpacer colSpan={3} />
                <tr style={{ background: BRAND.navy, color: BRAND.paper }}>
                  <th style={{ ...TH, textAlign: 'left', width: 26 }}>#</th>
                  <th style={{ ...TH, textAlign: 'left' }}>Applied to</th>
                  <th style={{ ...TH, textAlign: 'right', width: 110 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {p.allocations.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{
                      ...ROW,
                      borderBottom: `1px solid ${BRAND.line}`,
                      background: i % 2 ? BRAND.zebra : undefined,
                    }}
                  >
                    <td style={{ ...TD, color: BRAND.greyLight }}>{i + 1}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>
                      {docRefs[a.id] ?? (a.invoiceId ? 'Invoice' : a.billId ? 'Bill' : '—')}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>
                      {money(a.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(p.note || p.reversalReason || profile?.invoiceFooter) && (
          <div style={{ padding: `${PAGE_TOP_GAP}px 46px 0`, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={LABEL}>NOTES</div>
              <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body, whiteSpace: 'pre-wrap' }}>
                {[p.note, p.reversalReason, profile?.invoiceFooter].filter(Boolean).join('\n')}
              </div>
            </div>
          </div>
        )}

        <Filler />
        <BrandFooter
          left="RECEIVED BY · NAME & DATE"
          right="FOR NEW DIAMOND CORPORATION"
          note={isOut ? 'PAYMENT RECORD · NEW DIAMOND CORPORATION' : 'THANK YOU FOR YOUR BUSINESS'}
        />
      </BrandDoc>
    </div>
  );
}
