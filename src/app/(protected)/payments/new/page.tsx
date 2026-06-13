'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import PaymentForm from '../payment-form';

function Inner() {
  const sp = useSearchParams();
  return <PaymentForm initialPartyId={sp.get('partyId') ?? undefined} />;
}

export default function NewPaymentPage() {
  return (
    <div>
      <PageHeader title="Record payment" />
      <Suspense>
        <Inner />
      </Suspense>
    </div>
  );
}
