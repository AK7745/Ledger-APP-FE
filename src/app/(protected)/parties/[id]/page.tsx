'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import type { Party } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import PartyForm from '../party-form';

export default function EditPartyPage() {
  const { id } = useParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Party>(`parties/${id}`)
      .then(setParty)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit party" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {party && <PartyForm party={party} />}
    </div>
  );
}
