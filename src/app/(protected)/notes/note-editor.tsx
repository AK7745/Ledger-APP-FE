'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { money } from '@/lib/format';
import type { CreditDebitNote, Item, NoteKind } from '@/lib/types';
import { Button, Card, ErrorText, Field, Input, LinkButton, Select, Textarea } from '@/components/ui';

interface EditorLine {
  key: number;
  itemId: string;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
}
const num = (v: string) => { const n = Number(v); return isNaN(n) ? 0 : n; };

export default function NoteEditor({
  kind,
  partyId,
  invoiceId,
  billId,
}: {
  kind: NoteKind;
  partyId: string;
  invoiceId?: string;
  billId?: string;
}) {
  const router = useRouter();
  const keyRef = useRef(0);
  const nextKey = () => ++keyRef.current;
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<EditorLine[]>([
    { key: nextKey(), itemId: '', description: '', qty: '1', unitPrice: '0', discount: '0' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<Item[]>('items').then(setItems); }, []);

  function updateLine(key: number, patch: Partial<EditorLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function pickItem(key: number, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (item) updateLine(key, { itemId, description: item.name, unitPrice: String(Number(item.defaultSalePrice)) });
    else updateLine(key, { itemId: '' });
  }
  const lineTotal = (l: EditorLine) => num(l.qty) * num(l.unitPrice) - num(l.discount);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  async function save() {
    setError(null);
    if (lines.length === 0) return setError('Add at least one line');
    setSaving(true);
    try {
      const note = await api.post<CreditDebitNote>('notes', {
        kind, partyId, invoiceId, billId, reason: reason || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined, description: l.description,
          qty: num(l.qty), unitPrice: num(l.unitPrice), discount: num(l.discount),
        })),
      });
      router.push(`/notes/${note.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const verb = kind === 'CREDIT' ? 'credit (return from customer)' : 'debit (return to supplier)';

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-gray-500">
          This {kind === 'CREDIT' ? 'credit note' : 'debit note'} will reduce the {kind === 'CREDIT' ? "invoice's" : "bill's"} balance by its total — recording a {verb}.
        </p>
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
                  <Select value={l.itemId} onChange={(e) => pickItem(l.key, e.target.value)} className="mt-0 mb-1">
                    <option value="">Free text…</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </Select>
                  <Input value={l.description} placeholder="Description" onChange={(e) => updateLine(l.key, { description: e.target.value })} className="mt-0" />
                </td>
                <td className="py-2 pr-2 align-top"><Input type="number" min="0" step="0.001" value={l.qty} onChange={(e) => updateLine(l.key, { qty: e.target.value })} className="mt-0 text-right" /></td>
                <td className="py-2 pr-2 align-top"><Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })} className="mt-0 text-right" /></td>
                <td className="py-2 pr-2 align-top"><Input type="number" min="0" step="0.01" value={l.discount} onChange={(e) => updateLine(l.key, { discount: e.target.value })} className="mt-0 text-right" /></td>
                <td className="py-2 pr-2 text-right align-top tabular-nums text-gray-900">{money(lineTotal(l))}</td>
                <td className="py-2 align-top text-right"><button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-gray-400 hover:text-red-600">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setLines((ls) => [...ls, { key: nextKey(), itemId: '', description: '', qty: '1', unitPrice: '0', discount: '0' }])} className="mt-3 text-sm font-medium text-gray-700 hover:underline">+ Add line</button>
        <div className="mt-4 text-right text-base font-semibold text-gray-900">Total: {money(total)}</div>
      </Card>
      <Card>
        <Field label="Reason"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Card>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create draft note'}</Button>
        <LinkButton href={kind === 'CREDIT' ? `/invoices/${invoiceId}` : `/bills/${billId}`} variant="secondary">Cancel</LinkButton>
      </div>
    </div>
  );
}
