'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill, InvoiceStatus } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';

const TABS: { label: string; value?: InvoiceStatus }[] = [
  { label: 'All' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Unpaid', value: 'FINALIZED' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid', value: 'PAID' },
];

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<InvoiceStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : '';
    setBills(await api.get<Bill[]>(`bills${q}`));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Bills (payables)" action={<LinkButton href="/bills/new">New bill</LinkButton>} />
      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button key={t.label} onClick={() => setFilter(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm ${filter === t.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Their ref</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No bills yet.</td></tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} onClick={() => router.push(`/bills/${b.id}`)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.number ?? 'Draft'}</td>
                  <td className="px-4 py-3 text-gray-700">{b.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{b.supplierRef ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(b.issueDate)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{money(b.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{money(b.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
