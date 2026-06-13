'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { BusinessProfile } from '@/lib/types';
import { Button, Card, ErrorText, Field, Input, PageHeader, Textarea } from '@/components/ui';

const EMPTY = {
  businessName: '',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
  taxNumber: '',
  bankDetails: '',
  invoiceFooter: '',
  defaultCurrency: 'PKR',
  invoicePrefix: 'INV',
};

export default function SettingsPage() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<BusinessProfile | null>('business-profile').then((p) => {
      if (p) setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null)) });
    });
  }, []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };

  async function save() {
    setError(null);
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => k === 'businessName' || v !== ''),
    );
    try {
      await api.put('business-profile', payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Business profile" />
      <p className="mb-4 text-sm text-muted">
        These details appear on your invoices, receipts, and statements.
      </p>
      <Card>
        <div className="space-y-4">
          <Field label="Business name">
            <Input value={form.businessName} onChange={set('businessName')} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Tax / registration no."><Input value={form.taxNumber} onChange={set('taxNumber')} /></Field>
            <Field label="Logo URL" hint="paste an image link"><Input value={form.logoUrl} onChange={set('logoUrl')} /></Field>
            <Field label="Currency"><Input value={form.defaultCurrency} onChange={set('defaultCurrency')} /></Field>
            <Field label="Invoice prefix"><Input value={form.invoicePrefix} onChange={set('invoicePrefix')} /></Field>
          </div>
          <Field label="Address"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field>
          <Field label="Bank details" hint="shown on invoices for payment"><Textarea rows={2} value={form.bankDetails} onChange={set('bankDetails')} /></Field>
          <Field label="Invoice footer" hint="terms / thank-you note"><Textarea rows={2} value={form.invoiceFooter} onChange={set('invoiceFooter')} /></Field>

          <ErrorText>{error}</ErrorText>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
