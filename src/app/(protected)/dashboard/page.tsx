import { getCurrentUser } from '@/lib/api';

export default async function DashboardPage() {
  // Guaranteed non-null here (the protected layout already gated access).
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">
        Welcome{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        You are signed in as {user?.email} ({user?.role}).
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
        Invoices, parties, and payments will live here. Next up: building those modules.
      </div>
    </div>
  );
}
