'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Item } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import ItemForm from '../item-form';

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Item>(`items/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit item" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {item && <ItemForm item={item} />}
    </div>
  );
}
