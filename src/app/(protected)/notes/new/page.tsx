'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import NoteEditor from '../note-editor';
import type { NoteKind } from '@/lib/types';

function Inner() {
  const sp = useSearchParams();
  const kind = (sp.get('kind') === 'DEBIT' ? 'DEBIT' : 'CREDIT') as NoteKind;
  const partyId = sp.get('partyId') ?? '';
  const invoiceId = sp.get('invoiceId') ?? undefined;
  const billId = sp.get('billId') ?? undefined;
  return (
    <>
      <PageHeader title={kind === 'CREDIT' ? 'New credit note' : 'New debit note'} />
      {partyId ? (
        <NoteEditor kind={kind} partyId={partyId} invoiceId={invoiceId} billId={billId} />
      ) : (
        <p className="text-sm text-red-600">Missing target. Open a credit note from an invoice, or a debit note from a bill.</p>
      )}
    </>
  );
}

export default function NewNotePage() {
  return (
    <div>
      <Suspense>
        <Inner />
      </Suspense>
    </div>
  );
}
