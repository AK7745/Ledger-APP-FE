'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import PaymentForm from '../payment-form';
import type { PaymentDirection } from '@/lib/types';

function Inner() {
  const sp = useSearchParams();
  const direction = (sp.get('direction') === 'OUT' ? 'OUT' : 'IN') as PaymentDirection;
  return <PaymentForm initialPartyId={sp.get('partyId') ?? undefined} direction={direction} />;
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
