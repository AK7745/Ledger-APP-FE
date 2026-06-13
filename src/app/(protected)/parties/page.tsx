'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Party, PartyType } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui';
import { useDialog } from '@/components/dialog';

const TABS: { label: string; value?: PartyType }[] = [
  { label: 'All' },
  { label: 'Customers', value: 'CUSTOMER' },
  { label: 'Suppliers', value: 'SUPPLIER' },
];

const typeBadge: Record<PartyType, string> = {
  CUSTOMER: 'bg-blue-50 text-blue-700',
  SUPPLIER: 'bg-amber-50 text-amber-700',
  BOTH: 'bg-purple-50 text-purple-700',
};

export default function PartiesPage() {
  const dialog = useDialog();
  const [parties, setParties] = useState<Party[]>([]);
  const [filter, setFilter] = useState<PartyType | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = filter ? `?type=${filter}` : '';
    setParties(await api.get<Party[]>(`parties${q}`));
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function archive(id: string) {
    const ok = await dialog.confirm({
      title: 'Archive party',
      message: 'It stays in records but is hidden from lists.',
      confirmText: 'Archive',
      danger: true,
    });
    if (!ok) return;
    await api.del(`parties/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Parties"
        action={<LinkButton href="/parties/new">New party</LinkButton>}
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
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : parties.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No parties yet.</td></tr>
            ) : (
              parties.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[p.type]}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.phone || p.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/parties/${p.id}/statement`} className="text-gray-700 underline">
                      Statement
                    </Link>
                    <Link href={`/parties/${p.id}`} className="ml-4 text-gray-700 underline">
                      Edit
                    </Link>
                    <button
                      onClick={() => archive(p.id)}
                      className="ml-4 text-red-600 hover:underline"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
