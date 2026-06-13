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

  if (!p) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <PrintBar backHref={`/payments/${id}`} />
      <Sheet>
        <div className="flex items-start justify-between">
          <BusinessHeaderBlock profile={profile} />
          <div className="text-right">
            <div className="text-2xl font-bold tracking-wide text-gray-900">
              {p.direction === 'OUT' ? 'PAYMENT VOUCHER' : 'RECEIPT'}
            </div>
            <div className="mt-1 text-sm text-gray-700">{p.number}</div>
            <div className="mt-2 text-sm text-gray-600">{formatDate(p.date)}</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-wide text-gray-400">
            {p.direction === 'OUT' ? 'Paid to' : 'Received from'}
          </div>
          <div className="font-medium text-gray-900">{p.party?.name}</div>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-6 text-center print:bg-white print:ring-1 print:ring-gray-200">
          <div className="text-sm text-gray-500">Amount received</div>
          <div className="text-3xl font-bold tabular-nums text-gray-900">
            {money(p.amount)} {profile?.defaultCurrency ?? ''}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {p.method ?? ''}{p.reference ? ` · ${p.reference}` : ''}
          </div>
        </div>

        {p.allocations.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-400">Applied to</div>
            <table className="w-full text-sm">
              <tbody>
                {p.allocations.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{a.invoiceId ? 'Invoice' : '—'}</td>
                    <td className="py-2 text-right tabular-nums text-gray-900">{money(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profile?.invoiceFooter && (
          <p className="mt-10 border-t border-gray-200 pt-4 text-sm text-gray-500 whitespace-pre-wrap">
            {profile.invoiceFooter}
          </p>
        )}
      </Sheet>
    </div>
  );
}
