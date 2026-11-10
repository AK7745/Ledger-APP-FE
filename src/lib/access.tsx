import { redirect } from 'next/navigation';
import { getCurrentUser } from './api';
import { allows, type Rule } from './permissions';
import { NoAccess } from '@/components/no-access';

/**
 * Server-side page gate (docs/RBAC.md §10). Use it in a route segment's
 * `layout.tsx` so a typed URL is checked on the server before any client
 * page code runs:
 *
 *   export default function Layout({ children }) {
 *     return <RequireAccess rule="invoices.view">{children}</RequireAccess>;
 *   }
 *
 * A layout mounts when its segment is entered (it does not re-render while
 * navigating *within* it), so put one in every segment whose rule differs —
 * e.g. `invoices/` (view) and `invoices/new/` (manage).
 *
 * This is UX, not security: the API enforces every permission regardless.
 */
export async function RequireAccess({
  rule,
  children,
}: {
  rule: Rule;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(); // shared with the protected layout (React cache)
  if (!user) redirect('/login');
  if (!allows(user, rule)) return <NoAccess rule={rule} />;
  return <>{children}</>;
}
