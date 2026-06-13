'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { money } from '@/lib/format';
import type { Invoice, Item, Party } from '@/lib/types';
import { Button, Card, ErrorText, Field, Input, LinkButton, Select, Textarea } from '@/components/ui';

interface EditorLine {
  key: number;
  itemId: string;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
}

const num = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function InvoiceEditor({ invoice }: { invoice?: Invoice }) {
  const router = useRouter();
  const editing = !!invoice;
  const keyRef = useRef(0);
  const nextKey = () => ++keyRef.current;

  const [customers, setCustomers] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [partyId, setPartyId] = useState(invoice?.partyId ?? '');
  const [issueDate, setIssueDate] = useState(invoice?.issueDate?.slice(0, 10) ?? today());
  const [dueDate, setDueDate] = useState(invoice?.dueDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [invoiceDiscount, setInvoiceDiscount] = useState(
    invoice ? String(Number(invoice.invoiceDiscount)) : '0',
  );
  const [lines, setLines] = useState<EditorLine[]>(
    invoice?.lines.length
      ? invoice.lines.map((l) => ({
          key: nextKey(),
          itemId: l.itemId ?? '',
          description: l.description,
          qty: String(Number(l.qty)),
          unitPrice: String(Number(l.unitPrice)),
          discount: String(Number(l.discount)),
        }))
      : [{ key: nextKey(), itemId: '', description: '', qty: '1', unitPrice: '0', discount: '0' }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Party[]>('parties?type=CUSTOMER').then(setCustomers);
    api.get<Item[]>('items').then(setItems);
  }, []);

  function updateLine(key: number, patch: Partial<EditorLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickItem(key: number, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateLine(key, {
        itemId,
        description: item.name,
        unitPrice: String(Number(item.defaultSalePrice)),
      });
    } else {
      updateLine(key, { itemId: '' });
    }
  }

  const lineTotal = (l: EditorLine) => num(l.qty) * num(l.unitPrice) - num(l.discount);
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const grandTotal = subtotal - num(invoiceDiscount);

  async function save() {
    setError(null);
    if (!partyId) return setError('Choose a customer');
    if (lines.length === 0) return setError('Add at least one line');
    setSaving(true);
    const payload = {
      partyId,
      issueDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      invoiceDiscount: num(invoiceDiscount),
      lines: lines.map((l) => ({
        itemId: l.itemId || undefined,
        description: l.description,
        qty: num(l.qty),
        unitPrice: num(l.unitPrice),
        discount: num(l.discount),
      })),
    };
    try {
      const saved = editing
        ? await api.patch<Invoice>(`invoices/${invoice!.id}`, payload)
        : await api.post<Invoice>('invoices', payload);
      router.push(`/invoices/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <Select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div />
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date (optional)">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="pb-2 font-medium">Item / description</th>
              <th className="pb-2 font-medium w-20 text-right">Qty</th>
              <th className="pb-2 font-medium w-28 text-right">Unit price</th>
              <th className="pb-2 font-medium w-24 text-right">Discount</th>
              <th className="pb-2 font-medium w-28 text-right">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-gray-100">
                <td className="py-2 pr-2">
                  <Select
                    value={l.itemId}
                    onChange={(e) => pickItem(l.key, e.target.value)}
                    className="mt-0 mb-1"
                  >
                    <option value="">Free text…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={l.description}
                    placeholder="Description"
                    onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    className="mt-0"
                  />
                </td>
                <td className="py-2 pr-2 align-top">
                  <Input type="number" min="0" step="0.001" value={l.qty}
                    onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                    className="mt-0 text-right" />
                </td>
                <td className="py-2 pr-2 align-top">
                  <Input type="number" min="0" step="0.01" value={l.unitPrice}
                    onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                    className="mt-0 text-right" />
                </td>
                <td className="py-2 pr-2 align-top">
                  <Input type="number" min="0" step="0.01" value={l.discount}
                    onChange={(e) => updateLine(l.key, { discount: e.target.value })}
                    className="mt-0 text-right" />
                </td>
                <td className="py-2 pr-2 text-right align-top tabular-nums text-gray-900">
                  {money(lineTotal(l))}
                </td>
                <td className="py-2 align-top text-right">
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="text-gray-400 hover:text-red-600"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() =>
            setLines((ls) => [
              ...ls,
              { key: nextKey(), itemId: '', description: '', qty: '1', unitPrice: '0', discount: '0' },
            ])
          }
          className="mt-3 text-sm font-medium text-gray-700 hover:underline"
        >
          + Add line
        </button>
      </Card>

      <div className="flex gap-4">
        <Card>
          <Field label="Notes">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-72" />
          </Field>
        </Card>
        <div className="ml-auto w-72">
          <Card>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <dt>Invoice discount</dt>
                <dd>
                  <Input type="number" min="0" step="0.01" value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(e.target.value)}
                    className="mt-0 w-28 text-right" />
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <dt>Grand total</dt>
                <dd className="tabular-nums">{money(grandTotal)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save draft' : 'Create draft'}
        </Button>
        <LinkButton href={editing ? `/invoices/${invoice!.id}` : '/invoices'} variant="secondary">
          Cancel
        </LinkButton>
      </div>
      <p className="text-xs text-gray-400">
        Totals are recalculated on the server when you save. Finalize the invoice from its detail page to lock it and assign a number.
      </p>
    </div>
  );
}
