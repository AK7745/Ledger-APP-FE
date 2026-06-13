'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Item, StockMovement } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui';

const REASON_LABEL: Record<string, string> = {
  PURCHASE: 'Purchase (bill)',
  SALE: 'Sale (invoice)',
  ADJUSTMENT: 'Manual adjustment',
  SALE_RETURN: 'Customer return (credit note)',
  PURCHASE_RETURN: 'Return to supplier (debit note)',
  REVERSAL: 'Reversal (void)',
};

export default function ItemMovementsPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    api.get<Item>(`items/${id}`).then(setItem);
    api.get<StockMovement[]>(`inventory/${id}/movements`).then(setMovements);
  }, [id]);

  return (
    <div>
      <PageHeader title={`Stock history${item ? ` — ${item.name}` : ''}`} />
      {item && (
        <p className="mb-4 text-sm text-muted">
          Current on hand: <span className="font-semibold text-fg">{Number(item.stockOnHand)}</span> {item.unit}
        </p>
      )}
      <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No movements yet.</td></tr>
            ) : (
              movements.map((m) => {
                const q = Number(m.qty);
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-muted">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3 text-fg">{REASON_LABEL[m.reason] ?? m.reason}</td>
                    <td className="px-4 py-3 text-muted">{m.note ?? '—'}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${q < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {q > 0 ? `+${q}` : q}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
