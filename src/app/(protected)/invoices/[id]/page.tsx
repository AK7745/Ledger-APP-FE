'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { CreditDebitNote, Invoice } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { Button, Card, LinkButton } from '@/components/ui';
import { useDialog } from '@/components/dialog';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dialog = useDialog();
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
    const ok = await dialog.confirm({
      title: 'Finalize invoice',
      message: 'It will be locked and assigned a number.',
      confirmText: 'Finalize',
    });
    if (!ok) return;
    await act(() => api.post(`invoices/${id}/finalize`));
  }
  async function voidInvoice() {
    const reason = await dialog.prompt({
      title: 'Void invoice',
      label: 'Reason',
      placeholder: 'why this invoice is being voided',
      multiline: true,
      required: true,
      confirmText: 'Void',
    });
    if (!reason) return;
    await act(() => api.post(`invoices/${id}/void`, { reason }));
  }
  async function remove() {
    const ok = await dialog.confirm({
      title: 'Delete draft',
      message: 'This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
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
  if (!inv) return <p className="text-muted">Loading…</p>;

  const isDraft = inv.status === 'DRAFT';
  const canVoid = ['FINALIZED', 'PARTIAL', 'PAID'].includes(inv.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-fg">
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
            <div className="text-muted">Customer</div>
            <div className="font-medium text-fg">{inv.party?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted">Issue date</div>
            <div className="text-fg">{formatDate(inv.issueDate)}</div>
          </div>
          <div>
            <div className="text-muted">Due date</div>
            <div className="text-fg">{formatDate(inv.dueDate)}</div>
          </div>
        </div>
        {inv.voidReason && (
          <p className="mt-3 text-sm text-red-600">Voided: {inv.voidReason}</p>
        )}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
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
              <tr key={l.id} className="border-t border-line">
                <td className="py-2 text-fg">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.discount)}</td>
                <td className="py-2 text-right tabular-nums text-fg">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-64 space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span><span className="tabular-nums">{money(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Discount</span><span className="tabular-nums">{money(inv.discountTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-fg">
            <span>Grand total</span><span className="tabular-nums">{money(inv.grandTotal)}</span>
          </div>
          {!isDraft && (
            <>
              <div className="flex justify-between text-muted">
                <span>Paid</span><span className="tabular-nums">{money(inv.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-medium text-fg">
                <span>Balance due</span><span className="tabular-nums">{money(inv.balance)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {notes.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-medium text-fg">Credit notes</div>
          <table className="w-full text-sm">
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="border-t border-line first:border-0">
                  <td className="py-2">
                    <Link href={`/notes/${n.id}`} className="text-fg underline">{n.number ?? '(draft)'}</Link>
                  </td>
                  <td className="py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[n.status]}`}>{n.status}</span></td>
                  <td className="py-2 text-right tabular-nums text-fg">{money(n.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {inv.notes && (
        <Card>
          <div className="text-sm text-muted">Notes</div>
          <p className="mt-1 text-sm text-fg whitespace-pre-wrap">{inv.notes}</p>
        </Card>
      )}
    </div>
  );
}
