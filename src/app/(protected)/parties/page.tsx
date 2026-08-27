'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import type { Party, PartyType } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui';
import { useDialog } from '@/components/dialog';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  FilterBar, FilterSelect, Pagination, PanelField, SearchInput, ToggleChip,
} from '@/components/filters';

const SORTS = [
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
  { label: 'Newest first', value: 'created_desc' },
];

// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = ['hasBalance', 'includeArchived', 'sort'] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = ['q', 'type', 'includeArchived', 'hasBalance', 'sort', 'page', 'pageSize'] as const;

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Customers', value: 'CUSTOMER' },
  { label: 'Suppliers', value: 'SUPPLIER' },
  { label: 'Both', value: 'BOTH' },
];

const typeBadge: Record<PartyType, string> = {
  CUSTOMER: 'bg-blue-50 text-blue-700',
  SUPPLIER: 'bg-amber-50 text-amber-700',
  BOTH: 'bg-purple-50 text-purple-700',
};

function PartiesList() {
  const dialog = useDialog();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: parties, meta, loading, refreshing, error, reload } = useFetchList<Party>(
    `parties${apiQuery}`,
  );

  async function archive(id: string) {
    const ok = await dialog.confirm({
      title: 'Archive party',
      message: 'It stays in records but is hidden from lists.',
      confirmText: 'Archive',
      danger: true,
    });
    if (!ok) return;
    await api.del(`parties/${id}`);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Parties"
        action={<LinkButton href="/parties/new">New party</LinkButton>}
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => set({ type: t.value || undefined })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              (value.type ?? '') === t.value
                ? 'bg-accent text-white'
                : 'bg-surface text-muted ring-1 ring-line hover:bg-hover'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar
        fields={PANEL_FIELDS}
        value={value}
        onApply={set}
        onReset={reset}
        search={
          <SearchInput
            value={value.q ?? ''}
            onChange={(v) => set({ q: v || undefined })}
            placeholder="Search name, phone, email or tax ID…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Account state">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.hasBalance === 'true'}
                  onClick={() => setDraft({ hasBalance: draft.hasBalance ? undefined : 'true' })}
                >
                  Has outstanding
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
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : parties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0 ? 'No parties match these filters.' : 'No parties yet.'}
                </td>
              </tr>
            ) : (
              parties.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">
                    {p.name}
                    {p.archived && (
                      <span className="ml-2 rounded bg-hover px-1.5 py-0.5 text-xs text-muted">
                        archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[p.type]}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.phone || p.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/parties/${p.id}/statement`} className="text-fg underline">
                      Statement
                    </Link>
                    <Link href={`/parties/${p.id}`} className="ml-4 text-fg underline">
                      Edit
                    </Link>
                    <button
                      onClick={() => archive(p.id)}
                      className="ml-4 text-red-600 hover:underline"
                    >
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
          noun={'parties'}
        />
      )}
    </div>
  );
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <PartiesList />
    </Suspense>
  );
}
