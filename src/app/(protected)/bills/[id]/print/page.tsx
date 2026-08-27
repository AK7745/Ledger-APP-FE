'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill, BusinessProfile, Party } from '@/lib/types';
import { money } from '@/lib/format';
import { BRAND, amountInWords, longDate, paymentTerms } from '@/lib/brand';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PrintBar } from '@/components/documents';
import {
  BrandDoc, BrandFooter, DetailsGrid, DocTitle, Filler, GrandTotalBar, HeadSpacer,
  LABEL, MIN_ROWS, PAGE_TOP_GAP, PartyBlock, ROW, TH, TotalRow, cellStyle,
} from '@/components/brand-doc';

// A bill is a PURCHASE: the supplier's document, recorded on our side. So this
// is our office copy of a payable, not something sent to a customer — hence the
// "OFFICE COPY" tag and check/approve signatures rather than a customer receipt.
export default function BillPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<(Bill & { party?: Party }) | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Bill & { party?: Party }>(`bills/${id}`).then(setBill);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  useDocumentTitle(bill ? (bill.number ?? 'Bill-DRAFT') : null);

  if (!bill) return <p className="text-muted">Loading…</p>;

  const party = bill.party as Party | undefined;
  const currency = profile?.defaultCurrency ?? 'PKR';
  const fillers = Math.max(0, MIN_ROWS - bill.lines.length);
  // Same convention as invoices: subtotal is already net of line discounts, so
  // billDiscount alone bridges subtotal -> grandTotal. discountTotal would
  // double-count the line discounts.
  const billDiscount = Number(bill.billDiscount ?? 0);
  const cell = cellStyle(bill.lines.length);
  const terms = paymentTerms(bill.issueDate, bill.dueDate);

  return (
    <div>
      <PrintBar backHref={`/bills/${id}`} />

      <BrandDoc docRef={bill.number ?? 'DRAFT'} profile={profile}>
        <DocTitle
          title={bill.status === 'VOID' ? 'VOID PURCHASE BILL' : 'PURCHASE BILL'}
          tag="OFFICE COPY"
        />

        <div
          style={{
            padding: '26px 46px 0',
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 32,
          }}
        >
          <PartyBlock label="SUPPLIER" party={party} />
          <DetailsGrid
            rows={[
              ['Bill No.', bill.number ?? 'DRAFT'],
              bill.supplierRef ? ['Supplier ref.', bill.supplierRef] : null,
              ['Date', longDate(bill.issueDate)],
              bill.dueDate ? ['Due date', longDate(bill.dueDate)] : null,
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
              {bill.lines.map((line, i) => (
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
                const i = bill.lines.length + k;
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
            {bill.notes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={LABEL}>NOTES</div>
                <div style={{ fontSize: 10, lineHeight: 1.65, color: BRAND.body, whiteSpace: 'pre-wrap' }}>
                  {bill.notes}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TotalRow label="Subtotal" value={money(bill.subtotal)} />
            {billDiscount > 0 && (
              <TotalRow label="Bill discount" value={`- ${money(billDiscount)}`} zebra />
            )}
            {Number(bill.taxTotal ?? 0) > 0 && (
              <TotalRow label="Sales tax" value={money(bill.taxTotal)} />
            )}
            <GrandTotalBar label="TOTAL PAYABLE" value={`${currency} ${money(bill.grandTotal)}`} />
            <div style={{ padding: '7px 10px', fontSize: 9, color: BRAND.greyLight }}>
              Amount in words: {amountInWords(bill.grandTotal, currency)}
            </div>
            {Number(bill.amountPaid) > 0 && (
              <>
                <TotalRow label="Paid to date" value={money(bill.amountPaid)} />
                <TotalRow label="Balance payable" value={money(bill.balance)} zebra strong />
              </>
            )}
          </div>
        </div>

        <Filler />
        <BrandFooter
          left="CHECKED BY · NAME & DATE"
          right="APPROVED FOR PAYMENT"
          note="PURCHASE RECORD · NEW DIAMOND CORPORATION"
        />
      </BrandDoc>
    </div>
  );
}
