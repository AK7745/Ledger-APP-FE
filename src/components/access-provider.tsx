'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  allows,
  can,
  type Access,
  type Permission,
  type Rule,
} from '@/lib/permissions';

const AccessContext = createContext<Access | null>(null);

/**
 * Makes the user's access available to client components. Mounted once in the
 * protected layout with the server-fetched /auth/me data, so there is no extra
 * request and no flash of hidden-then-shown buttons.
 */
export function AccessProvider({
  access,
  children,
}: {
  access: Access;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ isOwner: access.isOwner, permissions: access.permissions }),
    [access.isOwner, access.permissions],
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

/** `const can = useCan(); can('invoices.void') && <Button …/>` */
export function useCan() {
  const access = useContext(AccessContext);
  return useMemo(
    () => Object.assign((p: Permission) => can(access, p), {
      rule: (r: Rule) => allows(access, r),
    }),
    [access],
  );
}

/** Declarative variant: renders children only if the rule is satisfied. */
export function Can({ rule, children }: { rule: Rule; children: React.ReactNode }) {
  const access = useContext(AccessContext);
  return allows(access, rule) ? <>{children}</> : null;
}
