import { PageHeader } from '@/components/ui';
import PartyForm from '../party-form';

export default function NewPartyPage() {
  return (
    <div>
      <PageHeader title="New party" />
      <PartyForm />
    </div>
  );
}
