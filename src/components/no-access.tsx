import Link from 'next/link';
import { describeRule, type Rule } from '@/lib/permissions';

/**
 * Shown in place of a page the user isn't allowed to open (e.g. a typed URL
 * or a stale bookmark). Names the missing permission so the owner knows what
 * to grant. Purely presentational: the API independently refuses the data.
 */
export function NoAccess({ rule }: { rule: Rule }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-line bg-surface p-8 text-center">
      <h1 className="text-lg font-semibold text-fg">No access</h1>
      <p className="mt-2 text-sm text-muted">
        Your role doesn&apos;t include access to this page. Ask the owner if
        you need it.
      </p>
      <p className="mt-3 text-xs text-muted">
        Needs: <code className="rounded bg-hover px-1.5 py-0.5">{describeRule(rule)}</code>
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
