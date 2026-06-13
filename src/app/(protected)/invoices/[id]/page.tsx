'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { CreditDebitNote, Invoice } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { Button, Card, LinkButton } from '@/components/ui';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState<CreditDebitNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<Invoice>(`invoices/${id}`).then((i) => {
      setInv(i);
      api
        .get<CreditDebitNote[]>(`notes?kind=CREDIT&partyId=${i.partyId}`)
        .then((ns) => setNotes(ns.filter((n) => n.invoiceId === id)));
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function finalize() {
    if (!confirm('Finalize this invoice? It will be locked and assigned a number.')) return;
    await act(() => api.post(`invoices/${id}/finalize`));
  }
  async function voidInvoice() {
    const reason = prompt('Reason for voiding this invoice?');
    if (!reason) return;
    await act(() => api.post(`invoices/${id}/void`, { reason }));
  }
  async function remove() {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.del(`invoices/${id}`);
      router.push('/invoices');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setBusy(false);
    }
  }

  if (error && !inv) return <p className="text-sm text-red-600">{error}</p>;
  if (!inv) return <p className="text-gray-400">Loading…</p>;

  const isDraft = inv.status === 'DRAFT';
  const canVoid = ['FINALIZED', 'PARTIAL', 'PAID'].includes(inv.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {inv.number ?? 'Draft invoice'}
          </h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
            {inv.status}
          </span>
        </div>
        <div className="flex gap-2">
          {!isDraft && <LinkButton href={`/invoices/${id}/print`} variant="secondary">Print / PDF</LinkButton>}
          {isDraft && <LinkButton href={`/invoices/${id}/edit`} variant="secondary">Edit</LinkButton>}
          {isDraft && <Button onClick={finalize} disabled={busy}>Finalize</Button>}
          {isDraft && <Button onClick={remove} disabled={busy} variant="danger">Delete</Button>}
          {canVoid && Number(inv.balance) > 0 && (
            <LinkButton href={`/payments/new?partyId=${inv.partyId}`}>Record payment</LinkButton>
          )}
          {canVoid && (
            <LinkButton href={`/notes/new?kind=CREDIT&partyId=${inv.partyId}&invoiceId=${id}`} variant="secondary">
              Credit note
            </LinkButton>
          )}
          {canVoid && <Button onClick={voidInvoice} disabled={busy} variant="danger">Void</Button>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Customer</div>
            <div className="font-medium text-gray-900">{inv.party?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Issue date</div>
            <div className="text-gray-900">{formatDate(inv.issueDate)}</div>
          </div>
          <div>
            <div className="text-gray-500">Due date</div>
            <div className="text-gray-900">{formatDate(inv.dueDate)}</div>
          </div>
        </div>
        {inv.voidReason && (
          <p className="mt-3 text-sm text-red-600">Voided: {inv.voidReason}</p>
        )}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit price</th>
              <th className="pb-2 font-medium text-right">Discount</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="py-2 text-gray-900">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.discount)}</td>
                <td className="py-2 text-right tabular-nums text-gray-900">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-64 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span className="tabular-nums">{money(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Discount</span><span className="tabular-nums">{money(inv.discountTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
            <span>Grand total</span><span className="tabular-nums">{money(inv.grandTotal)}</span>
          </div>
          {!isDraft && (
            <>
              <div className="flex justify-between text-gray-600">
                <span>Paid</span><span className="tabular-nums">{money(inv.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-900">
                <span>Balance due</span><span className="tabular-nums">{money(inv.balance)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {notes.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-medium text-gray-700">Credit notes</div>
          <table className="w-full text-sm">
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="border-t border-gray-100 first:border-0">
                  <td className="py-2">
                    <Link href={`/notes/${n.id}`} className="text-gray-700 underline">{n.number ?? '(draft)'}</Link>
                  </td>
                  <td className="py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[n.status]}`}>{n.status}</span></td>
                  <td className="py-2 text-right tabular-nums text-gray-900">{money(n.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {inv.notes && (
        <Card>
          <div className="text-sm text-gray-500">Notes</div>
          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{inv.notes}</p>
        </Card>
      )}
    </div>
  );
}
