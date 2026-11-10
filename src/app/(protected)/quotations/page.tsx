'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Party, Quotation } from '@/lib/types';
import { money, formatDate, isLapsed, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  AmountRange, DateRange, FilterBar, FilterSelect, Pagination, PanelField, SearchInput, ToggleChip,
} from '@/components/filters';

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Declined', value: 'DECLINED' },
  { label: 'Void', value: 'VOID' },
];

const SORTS = [
  { label: 'Newest first', value: 'date_desc' },
  { label: 'Oldest first', value: 'date_asc' },
  { label: 'Largest amount', value: 'amount_desc' },
  { label: 'Smallest amount', value: 'amount_asc' },
  { label: 'Expiring soonest', value: 'valid_asc' },
];

// Must match ListQuotationsDto on the API: an unknown param is rejected, not ignored.
// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = [
  'openOnly', 'expired', 'partyId', 'from', 'to', 'minAmount', 'maxAmount', 'sort',
] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = [
  'q', 'status', 'partyId', 'from', 'to',
  'minAmount', 'maxAmount', 'expired', 'openOnly', 'sort',
  'page', 'pageSize',
] as const;

function QuotationsList() {
  const router = useRouter();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: quotations, meta, loading, refreshing, error } = useFetchList<Quotation>(
    `quotations${apiQuery}`,
  );
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    api.get<Party[]>('parties?type=CUSTOMER').then(setParties).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="Quotations"
        action={<LinkButton href="/quotations/new">New quotation</LinkButton>}
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
            placeholder="Search number, customer, subject or notes…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="State">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.openOnly === 'true'}
                  onClick={() => setDraft({ openOnly: draft.openOnly ? undefined : 'true' })}
                >
                  Awaiting answer
                </ToggleChip>
                <ToggleChip
                  active={draft.expired === 'true'}
                  onClick={() => setDraft({ expired: draft.expired ? undefined : 'true' })}
                >
                  Lapsed
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

            <PanelField label="Quotation date">
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
              <th className="px-4 py-3 font-medium">Valid until</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0 ? 'No quotations match these filters.' : 'No quotations yet.'}
                </td>
              </tr>
            ) : (
              quotations.map((q) => {
                const lapsed = isLapsed(q.status, q.validUntil);
                return (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/quotations/${q.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-hover"
                  >
                    <td className="px-4 py-3 font-medium text-fg">{q.number ?? 'Draft'}</td>
                    <td className="px-4 py-3 text-fg">{q.party?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(q.issueDate)}</td>
                    <td className={`px-4 py-3 ${lapsed ? 'text-amber-600' : 'text-muted'}`}>
                      {formatDate(q.validUntil)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status]}`}>
                        {q.status}
                      </span>
                      {/* Nothing sweeps a quote into EXPIRED, so lapsing is shown
                          as a hint beside the real stored status. */}
                      {lapsed && (
                        <span className="ml-1.5 text-xs text-amber-600">lapsed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg">{money(q.grandTotal)}</td>
                  </tr>
                );
              })
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
          noun={'quotations'}
        />
      )}
    </div>
  );
}

export default function QuotationsPage() {
  // useSearchParams requires a Suspense boundary (Next 16 App Router).
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <QuotationsList />
    </Suspense>
  );
}
