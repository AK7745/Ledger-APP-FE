'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCan } from '@/components/access-provider';
import type { Rule } from '@/lib/permissions';

// Each entry declares the rule that opens its module — the SAME rule its
// segment layout enforces with <RequireAccess>, so a visible link never lands
// on "No access". Dashboard has no rule (it composes what you can see).
const links: { href: string; label: string; rule?: Rule }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/parties', label: 'Parties', rule: 'parties.view' },
  { href: '/items', label: 'Items', rule: 'items.view' },
  { href: '/inventory', label: 'Inventory', rule: 'inventory.view' },
  { href: '/quotations', label: 'Quotations', rule: 'quotations.view' },
  { href: '/invoices', label: 'Invoices', rule: 'invoices.view' },
  { href: '/bills', label: 'Bills', rule: 'bills.view' },
  { href: '/payments', label: 'Payments', rule: { any: ['payments.in.view', 'payments.out.view'] } },
  { href: '/settings', label: 'Settings', rule: 'settings.manage' },
];

export default function Nav() {
  const pathname = usePathname();
  const can = useCan();
  const visible = links.filter((l) => !l.rule || can.rule(l.rule));
  return (
    <nav className="flex gap-1">
      {visible.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-hover'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
