'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { BusinessProfile, Payment } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { PrintBar, BusinessHeaderBlock, Sheet } from '@/components/documents';

export default function ReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Payment | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    api.get<Payment>(`payments/${id}`).then(setP);
    api.get<BusinessProfile | null>('business-profile').then(setProfile);
  }, [id]);

  if (!p) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <PrintBar backHref={`/payments/${id}`} />
      <Sheet>
        <div className="flex items-start justify-between">
          <BusinessHeaderBlock profile={profile} />
          <div className="text-right">
            <div className="text-2xl font-bold tracking-wide text-fg">
              {p.direction === 'OUT' ? 'PAYMENT VOUCHER' : 'RECEIPT'}
            </div>
            <div className="mt-1 text-sm text-fg">{p.number}</div>
            <div className="mt-2 text-sm text-muted">{formatDate(p.date)}</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-wide text-muted">
            {p.direction === 'OUT' ? 'Paid to' : 'Received from'}
          </div>
          <div className="font-medium text-fg">{p.party?.name}</div>
        </div>

        <div className="mt-8 rounded-lg bg-app p-6 text-center print:bg-surface print:ring-1 print:ring-line">
          <div className="text-sm text-muted">Amount received</div>
          <div className="text-3xl font-bold tabular-nums text-fg">
            {money(p.amount)} {profile?.defaultCurrency ?? ''}
          </div>
          <div className="mt-1 text-sm text-muted">
            {p.method ?? ''}{p.reference ? ` · ${p.reference}` : ''}
          </div>
        </div>

        {p.allocations.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">Applied to</div>
            <table className="w-full text-sm">
              <tbody>
                {p.allocations.map((a) => (
                  <tr key={a.id} className="border-b border-line">
                    <td className="py-2 text-fg">{a.invoiceId ? 'Invoice' : '—'}</td>
                    <td className="py-2 text-right tabular-nums text-fg">{money(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profile?.invoiceFooter && (
          <p className="mt-10 border-t border-line pt-4 text-sm text-muted whitespace-pre-wrap">
            {profile.invoiceFooter}
          </p>
        )}
      </Sheet>
    </div>
  );
}
