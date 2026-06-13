'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { PageHeader } from '@/components/ui';

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await api.get<Item[]>('inventory'));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function adjust(id: string) {
    const raw = prompt('Adjust stock by (use a negative number to remove):');
    if (raw === null) return;
    const qty = Number(raw);
    if (!qty || isNaN(qty)) return alert('Enter a non-zero number');
    const note = prompt('Reason (optional):') ?? undefined;
    await api.post(`inventory/${id}/adjust`, { qty, note });
    load();
  }

  return (
    <div>
      <PageHeader title="Inventory" />
      <p className="mb-4 text-sm text-gray-500">
        Stock items only. Bills add stock, invoices remove it; use Adjust for corrections.
      </p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium text-right">On hand</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No inventory-tracked items. Mark a STOCK item with &ldquo;track inventory&rdquo;.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                  <td className="px-4 py-3 text-gray-500">{it.unit}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(it.stockOnHand) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number(it.stockOnHand)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => adjust(it.id)} className="text-gray-700 underline">Adjust</button>
                    <Link href={`/inventory/${it.id}`} className="ml-4 text-gray-700 underline">History</Link>
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
