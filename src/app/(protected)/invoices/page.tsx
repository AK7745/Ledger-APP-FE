'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';

const TABS: { label: string; value?: InvoiceStatus }[] = [
  { label: 'All' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Unpaid', value: 'FINALIZED' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid', value: 'PAID' },
];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<InvoiceStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : '';
    setInvoices(await api.get<Invoice[]>(`invoices${q}`));
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={<LinkButton href="/invoices/new">New invoice</LinkButton>}
      />

      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setFilter(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === t.value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No invoices yet.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.number ?? 'Draft'}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{money(inv.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{money(inv.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
