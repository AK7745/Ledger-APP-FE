'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui';
import { useDialog } from '@/components/dialog';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  FilterBar, FilterSelect, Pagination, PanelField, SearchInput, ToggleChip,
} from '@/components/filters';

const TYPES = [
  { label: 'Stock', value: 'STOCK' },
  { label: 'Service', value: 'SERVICE' },
];

const SORTS = [
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
  { label: 'Highest price', value: 'price_desc' },
  { label: 'Most stock', value: 'stock_desc' },
];

// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = ['type', 'trackedOnly', 'includeArchived', 'sort'] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = ['q', 'type', 'includeArchived', 'trackedOnly', 'sort', 'page', 'pageSize'] as const;

function ItemsList() {
  const dialog = useDialog();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: items, meta, loading, refreshing, error, reload } = useFetchList<Item>(
    `items${apiQuery}`,
  );

  async function archive(id: string) {
    const ok = await dialog.confirm({
      title: 'Archive item',
      message: 'Past invoices keep their copy.',
      confirmText: 'Archive',
      danger: true,
    });
    if (!ok) return;
    await api.del(`items/${id}`);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Items"
        action={<LinkButton href="/items/new">New item</LinkButton>}
      />

      <FilterBar
        fields={PANEL_FIELDS}
        value={value}
        onApply={set}
        onReset={reset}
        search={
          <SearchInput
            value={value.q ?? ''}
            onChange={(v) => set({ q: v || undefined })}
            placeholder="Search item name or unit…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Type">
              <FilterSelect
                label="Any type"
                value={draft.type ?? ''}
                onChange={(v) => setDraft({ type: v || undefined })}
                options={TYPES}
                full
              />
            </PanelField>

            <PanelField label="Catalogue">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.trackedOnly === 'true'}
                  onClick={() => setDraft({ trackedOnly: draft.trackedOnly ? undefined : 'true' })}
                >
                  Tracked only
                </ToggleChip>
                <ToggleChip
                  active={draft.includeArchived === 'true'}
                  onClick={() =>
                    setDraft({ includeArchived: draft.includeArchived ? undefined : 'true' })
                  }
                >
                  Include archived
                </ToggleChip>
              </div>
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
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium text-right">Default price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>

                <td colSpan={5} className="px-4 py-8 text-center text-muted">

                  {activeCount > 0 ? 'No items match these filters.' : 'No items yet.'}

                </td>

              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">{it.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      it.type === 'STOCK' ? 'bg-green-50 text-green-700' : 'bg-hover text-muted'
                    }`}>
                      {it.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{it.unit}</td>
                  <td className="px-4 py-3 text-right text-fg">{it.defaultSalePrice}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/items/${it.id}`} className="text-fg underline">Edit</Link>
                    <button onClick={() => archive(it.id)} className="ml-4 text-red-600 hover:underline">
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!loading && !error && meta && (
        <Pagination
          page={meta.page}
          pageCount={meta.pageCount}
          total={meta.total}
          pageSize={meta.pageSize}
          onPage={(p) => set({ page: String(p) })}
          onPageSize={(n) => set({ pageSize: String(n) })}
          busy={refreshing}
          noun={'items'}
        />
      )}
    </div>
  );
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ItemsList />
    </Suspense>
  );
}
