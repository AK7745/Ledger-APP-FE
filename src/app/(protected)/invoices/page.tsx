import { PageHeader } from '@/components/ui';

export default function InvoicesPage() {
  return (
    <div>
      <PageHeader title="Invoices" />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
        The invoice editor is the next chunk. The backend is ready.
      </div>
    </div>
  );
}
