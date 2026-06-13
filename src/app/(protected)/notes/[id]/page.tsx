'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { CreditDebitNote } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { Button, Card } from '@/components/ui';
import { useDialog } from '@/components/dialog';

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dialog = useDialog();
  const [n, setN] = useState<CreditDebitNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<CreditDebitNote>(`notes/${id}`).then(setN).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => load(), [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  }
  async function finalize() {
    const ok = await dialog.confirm({
      title: 'Finalize note',
      message: 'It will reduce the linked document and adjust stock.',
      confirmText: 'Finalize',
    });
    if (!ok) return;
    await act(() => api.post(`notes/${id}/finalize`));
  }
  async function voidNote() {
    const reason = await dialog.prompt({
      title: 'Void note',
      label: 'Reason',
      multiline: true,
      required: true,
      confirmText: 'Void',
    });
    if (!reason) return;
    await act(() => api.post(`notes/${id}/void`, { reason }));
  }
  async function remove() {
    const ok = await dialog.confirm({
      title: 'Delete draft note',
      message: 'This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try { await api.del(`notes/${id}`); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); setBusy(false); }
  }

  if (error && !n) return <p className="text-sm text-red-600">{error}</p>;
  if (!n) return <p className="text-gray-400">Loading…</p>;

  const isDraft = n.status === 'DRAFT';
  const targetHref = n.kind === 'CREDIT' ? `/invoices/${n.invoiceId}` : `/bills/${n.billId}`;
  const title = n.kind === 'CREDIT' ? 'Credit note' : 'Debit note';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{title} {n.number ?? '(draft)'}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[n.status]}`}>{n.status}</span>
        </div>
        <div className="flex gap-2">
          {isDraft && <Button onClick={finalize} disabled={busy}>Finalize</Button>}
          {isDraft && <Button onClick={remove} disabled={busy} variant="danger">Delete</Button>}
          {n.status !== 'DRAFT' && n.status !== 'VOID' && <Button onClick={voidNote} disabled={busy} variant="danger">Void</Button>}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-gray-500">{n.kind === 'CREDIT' ? 'Customer' : 'Supplier'}</div><div className="font-medium text-gray-900">{n.party?.name}</div></div>
          <div><div className="text-gray-500">Against</div><Link href={targetHref} className="font-medium text-gray-700 underline">{n.kind === 'CREDIT' ? 'Invoice' : 'Bill'}</Link></div>
          <div><div className="text-gray-500">Date</div><div className="text-gray-900">{formatDate(n.issueDate)}</div></div>
        </div>
        {n.reason && <p className="mt-3 text-sm text-gray-600">Reason: {n.reason}</p>}
        {n.voidReason && <p className="mt-2 text-sm text-red-600">Voided: {n.voidReason}</p>}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit price</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {n.lines.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="py-2 text-gray-900">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums text-gray-900">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-right text-base font-semibold text-gray-900">Total: {money(n.grandTotal)}</div>
      </Card>
    </div>
  );
}
