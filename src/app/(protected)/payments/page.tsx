'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Party, Payment } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { LinkButton, PageHeader } from '@/components/ui';
import { useListQuery } from '@/lib/use-list-query';
import { useFetchList } from '@/lib/use-fetch-list';
import {
  AmountRange, DateRange, FilterBar, FilterSelect, Pagination, PanelField, SearchInput, ToggleChip,
} from '@/components/filters';

const STATUSES = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Cleared', value: 'CLEARED' },
  { label: 'Bounced', value: 'BOUNCED' },
  { label: 'Void', value: 'VOID' },
];

const SORTS = [
  { label: 'Newest first', value: 'date_desc' },
  { label: 'Oldest first', value: 'date_asc' },
  { label: 'Largest amount', value: 'amount_desc' },
  { label: 'Smallest amount', value: 'amount_asc' },
];

// Paging defaults live here so the reference is stable across renders.
const PANEL_FIELDS = ['direction', 'status', 'partyId', 'method', 'from', 'to', 'minAmount', 'maxAmount', 'sort'] as const;

const PAGE_DEFAULTS = { page: '1', pageSize: '25' };

const KEYS = [
  'q', 'direction', 'status', 'partyId', 'method',
  'from', 'to', 'minAmount', 'maxAmount', 'sort',
  'page', 'pageSize',
] as const;

function PaymentsList() {
  const router = useRouter();
  const { value, set, reset, apiQuery, activeCount } = useListQuery(KEYS, PAGE_DEFAULTS);
  const { data: payments, meta, loading, refreshing, error } = useFetchList<Payment>(
    `payments${apiQuery}`,
  );
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    api.get<Party[]>('parties').then(setParties).catch(() => {});
  }, []);

  // Methods are free text on the API, so the options come from what exists.
  const methods = Array.from(
    new Set(payments.map((p) => p.method).filter((m): m is string => !!m)),
  ).sort();

  return (
    <div>
      <PageHeader
        title="Payments"
        action={
          <div className="flex gap-2">
            <LinkButton href="/payments/new" variant="secondary">Receive (customer)</LinkButton>
            <LinkButton href="/payments/new?direction=OUT">Pay supplier</LinkButton>
          </div>
        }
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
            placeholder="Search number, cheque ref, party or note…"
          />
        }
      >
        {(draft, setDraft) => (
          <>
            <PanelField label="Direction">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={draft.direction === 'IN'}
                  onClick={() =>
                    setDraft({ direction: draft.direction === 'IN' ? undefined : 'IN' })
                  }
                >
                  Received
                </ToggleChip>
                <ToggleChip
                  active={draft.direction === 'OUT'}
                  onClick={() =>
                    setDraft({ direction: draft.direction === 'OUT' ? undefined : 'OUT' })
                  }
                >
                  Paid out
                </ToggleChip>
              </div>
            </PanelField>

            <PanelField label="Status">
              <FilterSelect
                label="Any status"
                value={draft.status ?? ''}
                onChange={(v) => setDraft({ status: v || undefined })}
                options={STATUSES}
                full
              />
            </PanelField>

            <PanelField label="Party">
              <FilterSelect
                label="Any party"
                value={draft.partyId ?? ''}
                onChange={(v) => setDraft({ partyId: v || undefined })}
                options={parties.map((p) => ({ label: p.name, value: p.id }))}
                full
              />
            </PanelField>

            {methods.length > 0 && (
              <PanelField label="Method">
                <FilterSelect
                  label="Any method"
                  value={draft.method ?? ''}
                  onChange={(v) => setDraft({ method: v || undefined })}
                  options={methods.map((m) => ({ label: m, value: m }))}
                  full
                />
              </PanelField>
            )}

            <PanelField label="Date">
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
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {activeCount > 0 ? 'No payments match these filters.' : 'No payments yet.'}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/payments/${p.id}`)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-3 font-medium text-fg">{p.number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.direction === 'OUT' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {p.direction === 'OUT' ? 'Paid out' : 'Received'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-fg">{p.party?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.method ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.reference ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{money(p.amount)}</td>
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
          noun={'payments'}
        />
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <PaymentsList />
    </Suspense>
  );
}
