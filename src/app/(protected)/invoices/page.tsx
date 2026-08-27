'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Invoice, Party } from '@/lib/types';
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

// Must match the DTO on the API: an unknown param is rejected, not ignored.
// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = [
  'unpaidOnly', 'overdue', 'partyId', 'from', 'to', 'minAmount', 'maxAmount', 'sort',
] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = [
  'q', 'status', 'partyId', 'from', 'to',
  'minAmount', 'maxAmount', 'overdue', 'unpaidOnly', 'sort',
  'page', 'pageSize',
] as const;

function InvoicesList() {
  const router = useRouter();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: invoices, meta, loading, refreshing, error } = useFetchList<Invoice>(
    `invoices${apiQuery}`,
  );
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    api.get<Party[]>('parties?type=CUSTOMER').then(setParties).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={<LinkButton href="/invoices/new">New invoice</LinkButton>}
      />

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
            placeholder="Search number, customer or notes…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Payment state">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.unpaidOnly === 'true'}
                  onClick={() =>
                    setDraft({ unpaidOnly: draft.unpaidOnly ? undefined : 'true' })
                  }
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

            <PanelField label="Customer">
              <FilterSelect
                label="Any customer"
                value={draft.partyId ?? ''}
                onChange={(v) => setDraft({ partyId: v || undefined })}
                options={parties.map((p) => ({ label: p.name, value: p.id }))}
                full
              />
            </PanelField>

            <PanelField label="Issue date">
              <DateRange
                from={draft.from ?? ''}
                to={draft.to ?? ''}
                onChange={(patch) => setDraft(patch)}
              />
            </PanelField>

            <PanelField label="Amount">
              <AmountRange
                min={draft.minAmount ?? ''}
                max={draft.maxAmount ?? ''}
                onChange={(patch) => setDraft(patch)}
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
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0 ? 'No invoices match these filters.' : 'No invoices yet.'}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-hover"
                >
                  <td className="px-4 py-3 font-medium text-fg">{inv.number ?? 'Draft'}</td>
                  <td className="px-4 py-3 text-fg">{inv.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(inv.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(inv.balance)}</td>
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
          noun={'invoices'}
        />
      )}
    </div>
  );
}

export default function InvoicesPage() {
  // useSearchParams requires a Suspense boundary (Next 16 App Router).
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <InvoicesList />
    </Suspense>
  );
}
