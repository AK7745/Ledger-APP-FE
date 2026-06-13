'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Payment } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { Button, Card } from '@/components/ui';

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<Payment>(`payments/${id}`).then(setP).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => load(), [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !p) return <p className="text-sm text-red-600">{error}</p>;
  if (!p) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Receipt {p.number}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
        </div>
        <div className="flex gap-2">
          {p.status === 'PENDING' && <Button onClick={() => act(() => api.post(`payments/${id}/clear`))} disabled={busy}>Mark cleared</Button>}
          {(p.status === 'PENDING' || p.status === 'CLEARED') && (
            <Button variant="danger" disabled={busy}
              onClick={() => { const r = prompt('Reason cheque bounced?'); if (r) act(() => api.post(`payments/${id}/bounce`, { reason: r })); }}>
              Bounce
            </Button>
          )}
          {(p.status === 'PENDING' || p.status === 'CLEARED') && (
            <Button variant="danger" disabled={busy}
              onClick={() => { const r = prompt('Reason for voiding?'); if (r) act(() => api.post(`payments/${id}/void`, { reason: r })); }}>
              Void
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-gray-500">Customer</div><div className="font-medium text-gray-900">{p.party?.name}</div></div>
          <div><div className="text-gray-500">Amount</div><div className="text-lg font-semibold text-gray-900 tabular-nums">{money(p.amount)}</div></div>
          <div><div className="text-gray-500">Date</div><div className="text-gray-900">{formatDate(p.date)}</div></div>
          <div><div className="text-gray-500">Method</div><div className="text-gray-900">{p.method ?? '—'}{p.reference ? ` · ${p.reference}` : ''}</div></div>
        </div>
        {p.reversalReason && <p className="mt-3 text-sm text-red-600">{p.status}: {p.reversalReason}</p>}
      </Card>

      <Card>
        <div className="mb-2 text-sm font-medium text-gray-700">Applied to</div>
        <table className="w-full text-sm">
          <tbody>
            {p.allocations.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 first:border-0">
                <td className="py-2">
                  {a.invoiceId ? (
                    <Link href={`/invoices/${a.invoiceId}`} className="text-gray-700 underline">Invoice</Link>
                  ) : '—'}
                </td>
                <td className="py-2 text-right tabular-nums text-gray-900">{money(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
