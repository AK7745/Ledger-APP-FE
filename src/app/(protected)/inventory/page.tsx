'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { Button, ErrorText, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { Modal } from '@/components/dialog';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  FilterBar, FilterSelect, Pagination, PanelField, SearchInput,
} from '@/components/filters';

const STOCK_STATE = [
  { label: 'Low stock', value: 'low' },
  { label: 'Out of stock', value: 'out' },
  { label: 'Negative (oversold)', value: 'negative' },
];

const SORTS = [
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Least stock first', value: 'stock_asc' },
  { label: 'Most stock first', value: 'stock_desc' },
];

// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = ['stock', 'sort'] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = ['q', 'stock', 'sort', 'page', 'pageSize'] as const;

function InventoryList() {
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  // `error` below belongs to the adjust modal, so the load error is named apart.
  const { data: items, meta, loading, refreshing, error: loadError, reload } =
    useFetchList<Item>(`inventory${apiQuery}`);
  const [target, setTarget] = useState<Item | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adjust failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" />
      <p className="mb-4 text-sm text-muted">
        Stock items only. Bills add stock, invoices remove it; use Adjust for corrections.
      </p>
      <FilterBar
        fields={PANEL_FIELDS}
        value={value}
        onApply={set}
        onReset={reset}
        search={
          <SearchInput
            value={value.q ?? ''}
            onChange={(v) => set({ q: v || undefined })}
            placeholder="Search item name…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Stock level">
              <FilterSelect
                label="Any stock level"
                value={draft.stock ?? ''}
                onChange={(v) => setDraft({ stock: v || undefined })}
                options={STOCK_STATE}
                full
              />
            </PanelField>
            <PanelField label="Sort by">
              <FilterSelect
                label="Name A–Z"
                value={draft.sort ?? ''}
                onChange={(v) => setDraft({ sort: v || undefined })}
                options={SORTS}
                full
              />
            </PanelField>
          </>
        )}
      </FilterBar>

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium text-right">On hand</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0
                    ? 'No stock items match these filters.'
                    : 'No inventory-tracked items. Mark a STOCK item with \u201ctrack inventory\u201d.'}
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">{it.name}</td>
                  <td className="px-4 py-3 text-muted">{it.unit}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(it.stockOnHand) < 0 ? 'text-red-600' : 'text-fg'}`}>
                    {Number(it.stockOnHand)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openAdjust(it)} className="text-fg underline">Adjust</button>
                    <Link href={`/inventory/${it.id}`} className="ml-4 text-fg underline">History</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {loadError && <p className="mt-3 text-sm text-red-600">{loadError}</p>}
      {!loading && !loadError && meta && (
        <Pagination
          page={meta.page}
          pageCount={meta.pageCount}
          total={meta.total}
          pageSize={meta.pageSize}
          onPage={(p) => set({ page: String(p) })}
          onPageSize={(n) => set({ pageSize: String(n) })}
          busy={refreshing}
          noun={'stock items'}
        />
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Adjust stock — ${target?.name ?? ''}`}>
        <p className="text-sm text-muted">
          Current on hand: <span className="font-medium text-fg">{Number(target?.stockOnHand ?? 0)}</span> {target?.unit}
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <InventoryList />
    </Suspense>
  );
}
