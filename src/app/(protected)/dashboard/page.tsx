'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill, Invoice } from '@/lib/types';
import { money, formatDate, STATUS_BADGE } from '@/lib/format';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { useCan } from '@/components/access-provider';

const OPEN = ['FINALIZED', 'PARTIAL'];
const sumBalance = (docs: { status: string; balance: string }[]) =>
  docs.filter((d) => OPEN.includes(d.status)).reduce((s, d) => s + Number(d.balance), 0);

// The dashboard has no permission of its own (docs/RBAC.md D15): it is a
// summary of what the user can already see. Receivables need invoices.view,
// payables need bills.view, net position needs both — and nothing is fetched
// that the user isn't allowed to read.
export default function DashboardPage() {
  const router = useRouter();
  const can = useCan();
  const seeInvoices = can('invoices.view');
  const seeBills = can('bills.view');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      seeInvoices ? api.get<Invoice[]>('invoices') : Promise.resolve([] as Invoice[]),
      seeBills ? api.get<Bill[]>('bills') : Promise.resolve([] as Bill[]),
    ]).then(([inv, bl]) => {
      setInvoices(inv);
      setBills(bl);
      setLoading(false);
    });
  }, [seeInvoices, seeBills]);

  const cards = [seeInvoices, seeBills, seeInvoices && seeBills].filter(Boolean).length;
  const actions = [
    can('invoices.manage') && <LinkButton key="inv" href="/invoices/new" variant="secondary">New invoice</LinkButton>,
    can('bills.manage') && <LinkButton key="bill" href="/bills/new" variant="secondary">New bill</LinkButton>,
    can.rule({ any: ['payments.in.record', 'payments.out.record'] }) && (
      <LinkButton key="pay" href="/payments/new">Record payment</LinkButton>
    ),
  ].filter(Boolean);

  const receivable = sumBalance(invoices);
  const payable = sumBalance(bills);
  const net = receivable - payable;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = invoices.filter(
    (i) => OPEN.includes(i.status) && i.dueDate && i.dueDate.slice(0, 10) < today,
  );
  const drafts = invoices.filter((i) => i.status === 'DRAFT').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        action={actions.length > 0 && <div className="flex gap-2">{actions}</div>}
      />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : cards === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Your role doesn&apos;t include the invoice or bill summaries. Use the
            menu above for the areas you work in — or ask the owner if something
            is missing.
          </p>
        </Card>
      ) : (
        <>
          <div className={`grid gap-4 ${cards === 3 ? 'grid-cols-3' : cards === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {seeInvoices && (
            <Card>
              <div className="text-xs uppercase tracking-wide text-muted">Owed to you</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-green-700">{money(receivable)}</div>
              <div className="text-xs text-muted">across {invoices.filter((i) => OPEN.includes(i.status)).length} open invoices</div>
            </Card>
            )}
            {seeBills && (
            <Card>
              <div className="text-xs uppercase tracking-wide text-muted">You owe</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-red-700">{money(payable)}</div>
              <div className="text-xs text-muted">across {bills.filter((b) => OPEN.includes(b.status)).length} open bills</div>
            </Card>
            )}
            {seeInvoices && seeBills && (
            <Card>
              <div className="text-xs uppercase tracking-wide text-muted">Net position</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {money(Math.abs(net))}
              </div>
              <div className="text-xs text-muted">{net >= 0 ? 'in your favour' : 'you owe overall'}</div>
            </Card>
            )}
          </div>

          {(overdue.length > 0 || drafts > 0) && (
            <div className="flex gap-3 text-sm">
              {overdue.length > 0 && (
                <span className="rounded-md bg-red-50 px-3 py-1.5 text-red-700">
                  {overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''}
                </span>
              )}
              {drafts > 0 && (
                <span className="rounded-md bg-hover px-3 py-1.5 text-muted">
                  {drafts} draft invoice{drafts > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {seeInvoices && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-fg">Recent invoices</h2>
            <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Number</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 6).map((inv) => (
                    <tr key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="cursor-pointer border-b border-line last:border-0 hover:bg-hover">
                      <td className="px-4 py-3 font-medium text-fg">{inv.number ?? 'Draft'}</td>
                      <td className="px-4 py-3 text-fg">{inv.party?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(inv.issueDate)}</td>
                      <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>{inv.status}</span></td>
                      <td className="px-4 py-3 text-right tabular-nums text-fg">{money(inv.balance)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No invoices yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
