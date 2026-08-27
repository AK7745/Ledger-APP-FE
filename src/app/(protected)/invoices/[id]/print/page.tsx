'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { BusinessProfile, Invoice, Party } from '@/lib/types';
import { money } from '@/lib/format';
import { BRAND, amountInWords, longDate, paymentTerms } from '@/lib/brand';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PrintBar } from '@/components/documents';
import {
  BrandDoc, BrandFooter, DetailsGrid, DocTitle, Filler, GrandTotalBar, HeadSpacer,
  LABEL, MIN_ROWS, PAGE_TOP_GAP, PartyBlock, ROW, TH, TotalRow, cellStyle,
} from '@/components/brand-doc';

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<(Invoice & { party?: Party }) | null>(null);
  // Print-with-stamp is a per-print choice, not a saved preference.
  const [stamp, setStamp] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Invoice & { party?: Party }>(`invoices/${id}`).then(setInv);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  useDocumentTitle(inv ? (inv.number ?? 'Invoice-DRAFT') : null);

  if (!inv) return <p className="text-muted">Loading…</p>;

  const party = inv.party as Party | undefined;
  const currency = profile?.defaultCurrency ?? 'PKR';
  const fillers = Math.max(0, MIN_ROWS - inv.lines.length);
  // `subtotal` is already net of line discounts (lineTotal = qty*price - discount),
  // so the row that bridges subtotal -> grand total is invoiceDiscount alone.
  // `discountTotal` is a reporting figure (line + invoice) and would double-count.
  const invoiceDiscount = Number(inv.invoiceDiscount ?? 0);
  const cell = cellStyle(inv.lines.length);
  const terms = paymentTerms(inv.issueDate, inv.dueDate);

  return (
    <div>
      <PrintBar backHref={`/invoices/${id}`} onStampChange={setStamp} />

      <BrandDoc docRef={inv.number ?? 'DRAFT'} profile={profile}>
        <DocTitle
          title={inv.status === 'VOID' ? 'VOID INVOICE' : 'INVOICE'}
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
          <PartyBlock label="BILL TO" party={party} />
          <DetailsGrid
            rows={[
              ['Invoice No.', inv.number ?? 'DRAFT'],
              ['Date', longDate(inv.issueDate)],
              inv.dueDate ? ['Due date', longDate(inv.dueDate)] : null,
              terms ? ['Terms', terms] : null,
            ]}
          />
        </div>

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
              {inv.lines.map((line, i) => (
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
                const i = inv.lines.length + k;
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
            {(inv.notes || profile?.invoiceFooter) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={LABEL}>NOTES</div>
                <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body, whiteSpace: 'pre-wrap' }}>
                  {[inv.notes, profile?.invoiceFooter].filter(Boolean).join('\n')}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TotalRow label="Subtotal" value={money(inv.subtotal)} />
            {invoiceDiscount > 0 && (
              <TotalRow label="Invoice discount" value={`- ${money(invoiceDiscount)}`} zebra />
            )}
            {Number(inv.taxTotal ?? 0) > 0 && (
              <TotalRow label="Sales tax" value={money(inv.taxTotal)} />
            )}
            <GrandTotalBar label="TOTAL DUE" value={`${currency} ${money(inv.grandTotal)}`} />
            <div style={{ padding: '7px 10px', fontSize: 9, color: BRAND.greyLight }}>
              Amount in words: {amountInWords(inv.grandTotal, currency)}
            </div>
            {Number(inv.amountPaid) > 0 && (
              <>
                <TotalRow label="Paid to date" value={money(inv.amountPaid)} />
                <TotalRow label="Balance due" value={money(inv.balance)} zebra strong />
              </>
            )}
          </div>
        </div>

        <Filler />
        <BrandFooter stamp={stamp} left="RECEIVED BY · NAME & DATE" right="FOR NEW DIAMOND CORPORATION" />
      </BrandDoc>
    </div>
  );
}
