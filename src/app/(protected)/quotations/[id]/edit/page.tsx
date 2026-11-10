'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Quotation } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import QuotationEditor from '../../quotation-editor';

export default function EditQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Quotation>(`quotations/${id}`)
      .then(setQuotation)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit draft quotation" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {quotation && quotation.status !== 'DRAFT' && (
        <p className="text-sm text-red-600">Only draft quotations can be edited.</p>
      )}
      {quotation && quotation.status === 'DRAFT' && <QuotationEditor quotation={quotation} />}
    </div>
  );
}
