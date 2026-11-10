import { PageHeader } from '@/components/ui';
import QuotationEditor from '../quotation-editor';

export default function NewQuotationPage() {
  return (
    <div>
      <PageHeader title="New quotation" />
      <QuotationEditor />
    </div>
  );
}
