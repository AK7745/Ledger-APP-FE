'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Item, ItemType } from '@/lib/types';
import {
  Button,
  Card,
  ErrorText,
  Field,
  Input,
  LinkButton,
  Select,
} from '@/components/ui';

export default function ItemForm({ item }: { item?: Item }) {
  const router = useRouter();
  const editing = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? '',
    type: (item?.type ?? 'SERVICE') as ItemType,
    unit: item?.unit ?? 'pcs',
    defaultSalePrice: item?.defaultSalePrice ?? '',
    trackInventory: item?.trackInventory ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      unit: form.unit || 'pcs',
      defaultSalePrice: form.defaultSalePrice === '' ? 0 : Number(form.defaultSalePrice),
      trackInventory: form.type === 'STOCK' ? form.trackInventory : false,
    };
    try {
      if (editing) await api.patch(`items/${item!.id}`, payload);
      else await api.post('items', payload);
      router.push('/items');
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
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Type" hint="Stock = goods you hold; Service = charges like labour/travel">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ItemType })}
            >
              <option value="SERVICE">Service / charge</option>
              <option value="STOCK">Stock (physical goods)</option>
            </Select>
          </Field>
          <Field label="Unit">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="pcs, hr, kg…"
            />
          </Field>
          <Field label="Default sale price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.defaultSalePrice}
              onChange={(e) => setForm({ ...form, defaultSalePrice: e.target.value })}
            />
          </Field>
        </div>

        {form.type === 'STOCK' && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.trackInventory}
              onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
            />
            Track inventory for this item (used later by the inventory module)
          </label>
        )}

        <ErrorText>{error}</ErrorText>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create item'}
          </Button>
          <LinkButton href="/items" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
