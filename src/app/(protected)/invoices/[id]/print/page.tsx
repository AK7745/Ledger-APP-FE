'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { BusinessProfile, Invoice, Party } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { PrintBar, BusinessHeaderBlock, Sheet } from '@/components/documents';

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<(Invoice & { party?: Party }) | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Invoice & { party?: Party }>(`invoices/${id}`).then(setInv);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  if (!inv) return <p className="text-muted">Loading…</p>;
  const party = inv.party as Party | undefined;

  return (
    <div>
      <PrintBar backHref={`/invoices/${id}`} />
      <Sheet>
        <div className="flex items-start justify-between">
          <BusinessHeaderBlock profile={profile} />
          <div className="text-right">
            <div className="text-2xl font-bold tracking-wide text-fg">INVOICE</div>
            <div className="mt-1 text-sm text-fg">{inv.number ?? 'DRAFT'}</div>
            <div className="mt-2 text-sm text-muted">Issued: {formatDate(inv.issueDate)}</div>
            {inv.dueDate && <div className="text-sm text-muted">Due: {formatDate(inv.dueDate)}</div>}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-wide text-muted">Bill to</div>
          <div className="font-medium text-fg">{party?.name}</div>
          {party?.billingAddress && (
            <div className="whitespace-pre-wrap text-sm text-muted">{party.billingAddress}</div>
          )}
          {party?.phone && <div className="text-sm text-muted">{party.phone}</div>}
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit price</th>
              <th className="pb-2 font-medium text-right">Discount</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-line">
                <td className="py-2 text-fg">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.discount)}</td>
                <td className="py-2 text-right tabular-nums text-fg">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{money(inv.subtotal)}</span></div>
            <div className="flex justify-between text-muted"><span>Discount</span><span className="tabular-nums">{money(inv.discountTotal)}</span></div>
            <div className="flex justify-between border-t border-line pt-1 text-base font-semibold text-fg"><span>Total {profile?.defaultCurrency ?? ''}</span><span className="tabular-nums">{money(inv.grandTotal)}</span></div>
            {Number(inv.amountPaid) > 0 && (
              <>
                <div className="flex justify-between text-muted"><span>Paid</span><span className="tabular-nums">{money(inv.amountPaid)}</span></div>
                <div className="flex justify-between font-medium text-fg"><span>Balance due</span><span className="tabular-nums">{money(inv.balance)}</span></div>
              </>
            )}
          </div>
        </div>

        {(profile?.bankDetails || profile?.invoiceFooter || inv.notes) && (
          <div className="mt-10 space-y-3 border-t border-line pt-4 text-sm text-muted">
            {inv.notes && <p className="whitespace-pre-wrap">{inv.notes}</p>}
            {profile?.bankDetails && (
              <div><div className="font-medium text-fg">Payment details</div><p className="whitespace-pre-wrap">{profile.bankDetails}</p></div>
            )}
            {profile?.invoiceFooter && <p className="whitespace-pre-wrap text-muted">{profile.invoiceFooter}</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
