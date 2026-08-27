'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill, Party } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  AmountRange, DateRange, FilterBar, FilterSelect, Pagination, PanelField, SearchInput, ToggleChip,
} from '@/components/filters';

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Unpaid', value: 'FINALIZED' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Void', value: 'VOID' },
];

const SORTS = [
  { label: 'Newest first', value: 'date_desc' },
  { label: 'Oldest first', value: 'date_asc' },
  { label: 'Largest amount', value: 'amount_desc' },
  { label: 'Smallest amount', value: 'amount_asc' },
  { label: 'Largest balance', value: 'balance_desc' },
];

// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = ['unpaidOnly', 'overdue', 'partyId', 'from', 'to', 'minAmount', 'maxAmount', 'sort'] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = [
  'q', 'status', 'partyId', 'from', 'to',
  'minAmount', 'maxAmount', 'overdue', 'unpaidOnly', 'sort',
  'page', 'pageSize',
] as const;

function BillsList() {
  const router = useRouter();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: bills, meta, loading, refreshing, error } = useFetchList<Bill>(`bills${apiQuery}`);
  const [suppliers, setSuppliers] = useState<Party[]>([]);

  useEffect(() => {
    api.get<Party[]>('parties?type=SUPPLIER').then(setSuppliers).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Bills (payables)" action={<LinkButton href="/bills/new">New bill</LinkButton>} />

      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => set({ status: t.value || undefined })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              (value.status ?? '') === t.value
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
            placeholder="Search number, their ref, supplier or notes…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Payment state">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.unpaidOnly === 'true'}
                  onClick={() => setDraft({ unpaidOnly: draft.unpaidOnly ? undefined : 'true' })}
                >
                  Unpaid only
                </ToggleChip>
                <ToggleChip
                  active={draft.overdue === 'true'}
                  onClick={() => setDraft({ overdue: draft.overdue ? undefined : 'true' })}
                >
                  Overdue
                </ToggleChip>
              </div>
            </PanelField>

            <PanelField label="Supplier">
              <FilterSelect
                label="Any supplier"
                value={draft.partyId ?? ''}
                onChange={(v) => setDraft({ partyId: v || undefined })}
                options={suppliers.map((p) => ({ label: p.name, value: p.id }))}
                full
              />
            </PanelField>

            <PanelField label="Issue date">
              <DateRange from={draft.from ?? ''} to={draft.to ?? ''} onChange={(p) => setDraft(p)} />
            </PanelField>

            <PanelField label="Amount">
              <AmountRange
                min={draft.minAmount ?? ''}
                max={draft.maxAmount ?? ''}
                onChange={(p) => setDraft(p)}
              />
            </PanelField>
            <PanelField label="Sort by">
              <FilterSelect
                label="Newest first"
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
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Their ref</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0 ? 'No bills match these filters.' : 'No bills yet.'}
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} onClick={() => router.push(`/bills/${b.id}`)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-3 font-medium text-fg">{b.number ?? 'Draft'}</td>
                  <td className="px-4 py-3 text-fg">{b.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{b.supplierRef ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(b.issueDate)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(b.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(b.balance)}</td>
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
          noun={'bills'}
        />
      )}
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <BillsList />
    </Suspense>
  );
}
