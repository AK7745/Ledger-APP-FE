'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Invoice } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import InvoiceEditor from '../../invoice-editor';

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Invoice>(`invoices/${id}`)
      .then(setInvoice)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit draft invoice" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {invoice && invoice.status !== 'DRAFT' && (
        <p className="text-sm text-red-600">Only draft invoices can be edited.</p>
      )}
      {invoice && invoice.status === 'DRAFT' && <InvoiceEditor invoice={invoice} />}
    </div>
  );
}
