'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await api.get<Item[]>('items'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function archive(id: string) {
    if (!confirm('Archive this item? Past invoices keep their copy.')) return;
    await api.del(`items/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Items"
        action={<LinkButton href="/items/new">New item</LinkButton>}
      />

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium text-right">Default price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No items yet.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      it.type === 'STOCK' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {it.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{it.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{it.defaultSalePrice}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/items/${it.id}`} className="text-gray-700 underline">Edit</Link>
                    <button onClick={() => archive(it.id)} className="ml-4 text-red-600 hover:underline">
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
