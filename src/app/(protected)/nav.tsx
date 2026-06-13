'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/parties', label: 'Parties' },
  { href: '/items', label: 'Items' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/bills', label: 'Bills' },
  { href: '/payments', label: 'Payments' },
  { href: '/settings', label: 'Settings' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
