import { PageHeader } from '@/components/ui';
import BillEditor from '../bill-editor';

export default function NewBillPage() {
  return (
    <div>
      <PageHeader title="New bill" />
      <BillEditor />
    </div>
  );
}
