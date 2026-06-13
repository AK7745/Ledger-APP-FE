'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui';
import { useDialog } from '@/components/dialog';

export default function ItemsPage() {
  const dialog = useDialog();
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
    const ok = await dialog.confirm({
      title: 'Archive item',
      message: 'Past invoices keep their copy.',
      confirmText: 'Archive',
      danger: true,
    });
    if (!ok) return;
    await api.del(`items/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Items"
        action={<LinkButton href="/items/new">New item</LinkButton>}
      />

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
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
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No items yet.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">{it.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      it.type === 'STOCK' ? 'bg-green-50 text-green-700' : 'bg-hover text-muted'
                    }`}>
                      {it.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{it.unit}</td>
                  <td className="px-4 py-3 text-right text-fg">{it.defaultSalePrice}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/items/${it.id}`} className="text-fg underline">Edit</Link>
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
