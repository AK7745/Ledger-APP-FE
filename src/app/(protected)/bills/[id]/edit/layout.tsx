import { RequireAccess } from '@/lib/access';

// Server-side page gate — see src/lib/access.tsx and docs/RBAC.md §10.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireAccess rule={'bills.manage'}>{children}</RequireAccess>;
}
