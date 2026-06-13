import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import LogoutButton from './logout-button';
import Nav from './nav';
import ThemeToggle from './theme-toggle';
import { DialogProvider } from '@/components/dialog';

// Server-side auth gate: anything under (protected) requires a valid session.
// No middleware needed — if the cookie is missing/invalid, /auth/me fails and
// we redirect to login.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <DialogProvider>
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3 no-print">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-fg">Ledger</span>
          <Nav />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{user.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-app p-6 print:bg-surface print:p-0">
        <div className="mx-auto max-w-5xl print:max-w-none">{children}</div>
      </main>
    </div>
    </DialogProvider>
  );
}
