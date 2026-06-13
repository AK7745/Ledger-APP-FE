'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Statement } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { Card, LinkButton, PageHeader } from '@/components/ui';

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? 'text-gray-900'}`}>{value}</div>
    </Card>
  );
}

export default function StatementPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<Statement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Statement>(`parties/${id}/statement`).then(setS).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!s) return <p className="text-gray-400">Loading…</p>;

  const net = Number(s.summary.netBalance);
  const netLabel = net > 0 ? 'Owes you' : net < 0 ? 'You owe' : 'Settled';
  const netAccent = net > 0 ? 'text-green-700' : net < 0 ? 'text-red-700' : 'text-gray-900';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Statement — ${s.party.name}`}
        action={
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Print / PDF</button>
            <LinkButton href={`/payments/new?partyId=${id}`}>Receive</LinkButton>
            <LinkButton href={`/payments/new?partyId=${id}&direction=OUT`}>Pay</LinkButton>
          </div>
        }
      />

      <Card>
        <div className="text-xs uppercase tracking-wide text-gray-500">Net balance</div>
        <div className={`mt-1 text-3xl font-bold tabular-nums ${netAccent}`}>
          {money(Math.abs(net))}
        </div>
        <div className="text-sm text-gray-500">{netLabel}{net !== 0 ? '' : ' — nothing outstanding'}</div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Receivable outstanding" value={money(s.summary.outstanding)} accent="text-green-700" />
        <Stat label="Payable outstanding" value={money(s.summary.payableOutstanding)} accent="text-red-700" />
      </div>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <Stat label="Invoiced" value={money(s.summary.totalInvoiced)} />
        <Stat label="Received" value={money(s.summary.totalPaid)} />
        <Stat label="Billed" value={money(s.summary.totalBilled)} />
        <Stat label="Paid out" value={money(s.summary.totalPaidOut)} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Ref</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Debit (+)</th>
              <th className="px-4 py-3 font-medium text-right">Credit (−)</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {s.entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No activity yet.</td></tr>
            ) : (
              s.entries.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 text-gray-700">{e.ref ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {e.description}
                    {e.pending && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">pending</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{e.debit !== '0' ? money(e.debit) : ''}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{e.credit !== '0' ? money(e.credit) : ''}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">{money(e.runningBalance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Positive balance = they owe you; negative = you owe them.</p>
    </div>
  );
}
