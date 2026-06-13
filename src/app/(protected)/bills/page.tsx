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
            className={`rounded-md px-3 py-1.5 text-sm ${filter === t.value ? 'bg-accent text-white' : 'bg-surface text-muted ring-1 ring-line hover:bg-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No bills yet.</td></tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} onClick={() => router.push(`/bills/${b.id}`)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-3 font-medium text-fg">{b.number ?? 'Draft'}</td>
                  <td className="px-4 py-3 text-fg">{b.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{b.supplierRef ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(b.issueDate)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(b.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(b.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
