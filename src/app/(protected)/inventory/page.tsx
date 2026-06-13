'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { Button, ErrorText, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { Modal } from '@/components/dialog';

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Item | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await api.get<Item[]>('inventory'));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openAdjust(item: Item) {
    setTarget(item);
    setQty('');
    setNote('');
    setError(null);
  }

  async function submitAdjust() {
    const n = Number(qty);
    if (!n || isNaN(n)) { setError('Enter a non-zero number (negative removes stock)'); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post(`inventory/${target!.id}/adjust`, { qty: n, note: note || undefined });
      setTarget(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adjust failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" />
      <p className="mb-4 text-sm text-gray-500">
        Stock items only. Bills add stock, invoices remove it; use Adjust for corrections.
      </p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium text-right">On hand</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No inventory-tracked items. Mark a STOCK item with &ldquo;track inventory&rdquo;.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                  <td className="px-4 py-3 text-gray-500">{it.unit}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(it.stockOnHand) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number(it.stockOnHand)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openAdjust(it)} className="text-gray-700 underline">Adjust</button>
                    <Link href={`/inventory/${it.id}`} className="ml-4 text-gray-700 underline">History</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Adjust stock — ${target?.name ?? ''}`}>
        <p className="text-sm text-gray-500">
          Current on hand: <span className="font-medium text-gray-900">{Number(target?.stockOnHand ?? 0)}</span> {target?.unit}
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Adjust by" hint="positive adds, negative removes">
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. -5" />
          </Field>
          <Field label="Reason (optional)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="breakage, recount, …" />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={saving}>{saving ? 'Saving…' : 'Apply'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
