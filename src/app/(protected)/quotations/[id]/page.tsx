'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Invoice, Quotation } from '@/lib/types';
import { money, formatDate, isLapsed, STATUS_BADGE } from '@/lib/format';
import { Button, Card, LinkButton } from '@/components/ui';
import { useDialog } from '@/components/dialog';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dialog = useDialog();
  const [q, setQ] = useState<Quotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<Quotation>(`quotations/${id}`)
      .then(setQ)
      .catch((e) => setError(e.message));
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

  async function issue() {
    const ok = await dialog.confirm({
      title: 'Issue quotation',
      message: 'It will be locked and assigned a number.',
      confirmText: 'Issue',
    });
    if (!ok) return;
    await act(() => api.post(`quotations/${id}/finalize`));
  }

  async function accept() {
    const ok = await dialog.confirm({
      title: 'Mark as accepted',
      message: 'Record that the customer accepted this quotation.',
      confirmText: 'Accept',
    });
    if (!ok) return;
    await act(() => api.post(`quotations/${id}/accept`));
  }

  async function decline() {
    const ok = await dialog.confirm({
      title: 'Mark as declined',
      message: 'Record that the customer declined this quotation.',
      confirmText: 'Decline',
    });
    if (!ok) return;
    await act(() => api.post(`quotations/${id}/decline`));
  }

  async function convert() {
    // The dropped-line count is stated up front rather than reported after the
    // fact, because converting navigates away to the new invoice.
    const ok = await dialog.confirm({
      title: 'Convert to invoice',
      message: pending.length
        ? `A draft invoice will be created from the ${priced.length} priced line(s). The ${pending.length} item(s) pending rate cannot be invoiced without a price and will not be carried over.`
        : 'A draft invoice will be created from this quotation. You can review it before finalizing.',
      confirmText: 'Create draft invoice',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ invoice: Invoice }>(`quotations/${id}/convert`);
      router.push(`/invoices/${res.invoice.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed');
      setBusy(false);
    }
  }

  async function voidQuotation() {
    const reason = await dialog.prompt({
      title: 'Void quotation',
      label: 'Reason',
      placeholder: 'why this quotation is being voided',
      multiline: true,
      required: true,
      confirmText: 'Void',
    });
    if (!reason) return;
    await act(() => api.post(`quotations/${id}/void`, { reason }));
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
      await api.del(`quotations/${id}`);
      router.push('/quotations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setBusy(false);
    }
  }

  if (error && !q) return <p className="text-sm text-red-600">{error}</p>;
  if (!q) return <p className="text-muted">Loading…</p>;

  const isDraft = q.status === 'DRAFT';
  const answerable = q.status === 'SENT' || q.status === 'EXPIRED';
  const canVoid = !isDraft && q.status !== 'VOID';
  const lapsed = isLapsed(q.status, q.validUntil);
  // A quotation is split into priced lines and lines still awaiting a rate —
  // the same two sections the printed sheet uses.
  const priced = q.lines.filter((l) => l.unitPrice !== null);
  const pending = q.lines.filter((l) => l.unitPrice === null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-fg">{q.number ?? 'Draft quotation'}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status]}`}>
            {q.status}
          </span>
          {lapsed && <span className="text-xs text-amber-600">lapsed {formatDate(q.validUntil)}</span>}
        </div>
        <div className="flex gap-2">
          {!isDraft && (
            <LinkButton href={`/quotations/${id}/print`} variant="secondary">Print / PDF</LinkButton>
          )}
          {isDraft && <LinkButton href={`/quotations/${id}/edit`} variant="secondary">Edit</LinkButton>}
          {isDraft && <Button onClick={issue} disabled={busy}>Issue</Button>}
          {isDraft && <Button onClick={remove} disabled={busy} variant="danger">Delete</Button>}
          {answerable && <Button onClick={accept} disabled={busy}>Accepted</Button>}
          {answerable && <Button onClick={decline} disabled={busy} variant="secondary">Declined</Button>}
          {q.status === 'ACCEPTED' && !q.convertedInvoiceId && (
            <Button onClick={convert} disabled={busy}>Convert to invoice</Button>
          )}
          {canVoid && <Button onClick={voidQuotation} disabled={busy} variant="danger">Void</Button>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {q.convertedInvoiceId && (
        <Card>
          <p className="text-sm text-fg">
            Converted to{' '}
            <Link href={`/invoices/${q.convertedInvoiceId}`} className="font-medium underline">
              a draft invoice
            </Link>{' '}
            on {formatDate(q.convertedAt)}.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted">Customer</div>
            <div className="font-medium text-fg">{q.party?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted">Quotation date</div>
            <div className="text-fg">{formatDate(q.issueDate)}</div>
          </div>
          <div>
            <div className="text-muted">Valid until</div>
            <div className={lapsed ? 'text-amber-600' : 'text-fg'}>{formatDate(q.validUntil)}</div>
          </div>
        </div>
        {q.subject && (
          <div className="mt-3 text-sm">
            <div className="text-muted">Subject</div>
            <div className="text-fg">{q.subject}</div>
          </div>
        )}
        {q.voidReason && <p className="mt-3 text-sm text-red-600">Voided: {q.voidReason}</p>}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit price</th>
              <th className="pb-2 text-right font-medium">Discount</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {priced.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="py-2 text-fg">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.discount)}</td>
                <td className="py-2 text-right tabular-nums text-fg">{money(l.lineTotal)}</td>
              </tr>
            ))}
            {priced.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={5} className="py-3 text-center text-muted">
                  No priced lines — every item on this quotation is awaiting a rate.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span><span className="tabular-nums">{money(q.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Discount</span><span className="tabular-nums">{money(q.discountTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-fg">
            <span>Total</span><span className="tabular-nums">{money(q.grandTotal)}</span>
          </div>
          {pending.length > 0 && (
            <p className="pt-1 text-xs text-amber-600">
              Excludes {pending.length} item{pending.length > 1 ? 's' : ''} pending rate.
            </p>
          )}
        </div>
      </Card>

      {/* Items quoted without a rate get their own block here and on the printed
          sheet. Showing them inside the priced table with blank money columns
          would read as zeros. */}
      {pending.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-medium text-fg">
            Items pending rate
            <span className="ml-2 font-normal text-muted">— not included in the total</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="pb-2 font-medium">Description</th>
                <th className="w-24 pb-2 text-right font-medium">Qty</th>
                <th className="w-1/3 pb-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="py-2 text-fg">{l.description}</td>
                  <td className="py-2 text-right tabular-nums">{Number(l.qty)}</td>
                  <td className="py-2 text-muted">{l.rateNote ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {q.notes && (
        <Card>
          <div className="text-sm text-muted">Notes</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{q.notes}</p>
        </Card>
      )}
    </div>
  );
}
