import { PageHeader } from '@/components/ui';
import ItemForm from '../item-form';

export default function NewItemPage() {
  return (
    <div>
      <PageHeader title="New item" />
      <ItemForm />
    </div>
  );
}
