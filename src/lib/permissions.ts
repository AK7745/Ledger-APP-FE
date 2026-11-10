// Permission keys and checks, shared by server and client code (no React, no
// Next imports). Mirrors the API's catalog (ledger-api/src/auth/permissions/
// catalog.ts) — the API is the authority and enforces every one of these;
// the UI only uses them to decide what to SHOW (docs/RBAC.md D14).

export const PERMISSIONS = [
  'parties.view',
  'parties.manage',
  'parties.statement',
  'items.view',
  'items.manage',
  'inventory.view',
  'inventory.adjust',
  'quotations.view',
  'quotations.manage',
  'quotations.issue',
  'quotations.void',
  'invoices.view',
  'invoices.manage',
  'invoices.finalize',
  'invoices.void',
  'invoices.opening_balance',
  'bills.view',
  'bills.manage',
  'bills.finalize',
  'bills.void',
  'bills.opening_balance',
  'payments.in.view',
  'payments.in.record',
  'payments.out.view',
  'payments.out.record',
  'payments.clear',
  'payments.reverse',
  'notes.credit',
  'notes.debit',
  'notes.void',
  'settings.manage',
  'admin.users',
  'admin.roles',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** What the UI needs to make access decisions (a subset of AuthUser). */
export interface Access {
  isOwner: boolean;
  permissions: readonly string[];
}

/**
 * An access rule: one permission, all of several, or any of several. Mirrors
 * the API's @RequirePermission / @RequireAnyPermission.
 */
export type Rule = Permission | { all: Permission[] } | { any: Permission[] };

export function can(access: Access | null | undefined, p: Permission): boolean {
  if (!access) return false;
  return access.isOwner || access.permissions.includes(p);
}

export function allows(access: Access | null | undefined, rule: Rule): boolean {
  if (typeof rule === 'string') return can(access, rule);
  if ('all' in rule) return rule.all.every((p) => can(access, p));
  return rule.any.some((p) => can(access, p));
}

/** Human description of a rule, for "No access" messages. */
export function describeRule(rule: Rule): string {
  if (typeof rule === 'string') return rule;
  if ('all' in rule) return rule.all.join(' + ');
  return `one of ${rule.any.join(', ')}`;
}
