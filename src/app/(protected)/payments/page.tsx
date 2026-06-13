'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Payment } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Payment[]>('payments').then((p) => {
      setPayments(p);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Payments"
        action={
          <div className="flex gap-2">
            <LinkButton href="/payments/new" variant="secondary">Receive (customer)</LinkButton>
            <LinkButton href="/payments/new?direction=OUT">Pay supplier</LinkButton>
          </div>
        }
      />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payments yet.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/payments/${p.id}`)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.direction === 'OUT' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {p.direction === 'OUT' ? 'Paid out' : 'Received'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-gray-700">{p.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.method ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{money(p.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
