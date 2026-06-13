'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { money, formatDate } from '@/lib/format';
import type { Invoice, Party, Payment } from '@/lib/types';
import { Button, Card, ErrorText, Field, Input, LinkButton, Select } from '@/components/ui';

const num = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const today = () => new Date().toISOString().slice(0, 10);

export default function PaymentForm({ initialPartyId }: { initialPartyId?: string }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Party[]>([]);
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [partyId, setPartyId] = useState(initialPartyId ?? '');
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'CLEARED' | 'PENDING'>('CLEARED');
  const [amount, setAmount] = useState('0');
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Party[]>('parties?type=CUSTOMER').then(setCustomers);
  }, []);

  // Load the party's open (payable) invoices, oldest first.
  useEffect(() => {
    if (!partyId) {
      setOpenInvoices([]);
      return;
    }
    api.get<Invoice[]>(`invoices?partyId=${partyId}`).then((all) => {
      const open = all
        .filter((i) => ['FINALIZED', 'PARTIAL'].includes(i.status) && Number(i.balance) > 0)
        .sort((a, b) => +new Date(a.issueDate) - +new Date(b.issueDate));
      setOpenInvoices(open);
    });
  }, [partyId]);

  // Auto-allocate oldest-first whenever amount or the invoice set changes.
  useEffect(() => {
    let remaining = num(amount);
    const next: Record<string, string> = {};
    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(inv.balance));
      next[inv.id] = String(Number(take.toFixed(2)));
      remaining -= take;
    }
    setAlloc(next);
  }, [amount, openInvoices]);

  const allocated = useMemo(
    () => Object.values(alloc).reduce((s, v) => s + num(v), 0),
    [alloc],
  );
  const remaining = num(amount) - allocated;

  async function save() {
    setError(null);
    if (!partyId) return setError('Choose a customer');
    if (num(amount) <= 0) return setError('Enter an amount');
    if (Math.abs(remaining) > 0.001)
      return setError(`Allocate the full amount — ${money(remaining)} still unallocated`);
    const allocations = Object.entries(alloc)
      .filter(([, v]) => num(v) > 0)
      .map(([invoiceId, v]) => ({ invoiceId, amount: num(v) }));
    setSaving(true);
    try {
      const payment = await api.post<Payment>('payments', {
        partyId,
        amount: num(amount),
        date,
        method: method || undefined,
        reference: reference || undefined,
        status,
        allocations,
      });
      router.push(`/payments/${payment.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Customer">
            <Select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Amount received">
            <Input type="number" min="0" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} className="text-right" />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Reference" hint="cheque no. / transfer id">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Status" hint="Pending = post-dated/uncleared cheque">
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'CLEARED' | 'PENDING')}>
              <option value="CLEARED">Cleared (counts now)</option>
              <option value="PENDING">Pending (cheque not yet cleared)</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Apply to invoices (oldest first)</h2>
          <span className={`text-sm ${Math.abs(remaining) > 0.001 ? 'text-amber-600' : 'text-green-600'}`}>
            Allocated {money(allocated)} / {money(num(amount))}
            {Math.abs(remaining) > 0.001 && ` — ${money(remaining)} left`}
          </span>
        </div>
        {!partyId ? (
          <p className="py-4 text-center text-sm text-gray-400">Select a customer to see open invoices.</p>
        ) : openInvoices.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No open invoices for this customer.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Balance</th>
                <th className="pb-2 font-medium text-right w-32">Apply</th>
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{inv.number}</td>
                  <td className="py-2 text-gray-500">{formatDate(inv.issueDate)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{money(inv.balance)}</td>
                  <td className="py-2 text-right">
                    <Input type="number" min="0" step="0.01" value={alloc[inv.id] ?? '0'}
                      onChange={(e) => setAlloc({ ...alloc, [inv.id]: e.target.value })}
                      className="mt-0 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
        <LinkButton href="/payments" variant="secondary">Cancel</LinkButton>
      </div>
    </div>
  );
}
