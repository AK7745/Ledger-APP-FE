import { PageHeader } from '@/components/ui';
import InvoiceEditor from '../invoice-editor';

export default function NewInvoicePage() {
  return (
    <div>
      <PageHeader title="New invoice" />
      <InvoiceEditor />
    </div>
  );
}
