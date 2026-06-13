'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Party, PartyType } from '@/lib/types';
import {
  Button,
  Card,
  ErrorText,
  Field,
  Input,
  LinkButton,
  Select,
  Textarea,
} from '@/components/ui';

export default function PartyForm({ party }: { party?: Party }) {
  const router = useRouter();
  const editing = !!party;
  const [form, setForm] = useState({
    name: party?.name ?? '',
    type: (party?.type ?? 'CUSTOMER') as PartyType,
    email: party?.email ?? '',
    phone: party?.phone ?? '',
    billingAddress: party?.billingAddress ?? '',
    taxId: party?.taxId ?? '',
    notes: party?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    // Drop empty optional strings so we don't send "".
    const payload = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => k === 'name' || k === 'type' || v !== ''),
    );
    try {
      if (editing) await api.patch(`parties/${party!.id}`, payload);
      else await api.post('parties', payload);
      router.push('/parties');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={set('type')}>
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="BOTH">Both</option>
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Tax ID">
            <Input value={form.taxId} onChange={set('taxId')} />
          </Field>
        </div>
        <Field label="Billing address">
          <Textarea rows={2} value={form.billingAddress} onChange={set('billingAddress')} />
        </Field>
        <Field label="Notes">
          <Textarea rows={2} value={form.notes} onChange={set('notes')} />
        </Field>

        <ErrorText>{error}</ErrorText>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create party'}
          </Button>
          <LinkButton href="/parties" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
