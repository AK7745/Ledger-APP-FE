'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Bill } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import BillEditor from '../../bill-editor';

export default function EditBillPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Bill>(`bills/${id}`).then(setBill).catch((e) => setError(e.message));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit draft bill" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {bill && bill.status !== 'DRAFT' && <p className="text-sm text-red-600">Only draft bills can be edited.</p>}
      {bill && bill.status === 'DRAFT' && <BillEditor bill={bill} />}
    </div>
  );
}
