// Money values arrive as strings (Prisma Decimal). Format for display.
export function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  FINALIZED: 'bg-blue-50 text-blue-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  PAID: 'bg-green-50 text-green-700',
  VOID: 'bg-red-50 text-red-700',
  // payment statuses
  PENDING: 'bg-amber-50 text-amber-700',
  CLEARED: 'bg-green-50 text-green-700',
  BOUNCED: 'bg-red-50 text-red-700',
  // quotation statuses
  SENT: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  DECLINED: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-amber-50 text-amber-700',
};

/**
 * A quotation is only ever stored as SENT — nothing sweeps it into EXPIRED on a
 * timer — so the UI derives lapsed-ness from the date, exactly as the API's
 * `?expired` filter does.
 */
export function isLapsed(status: string, validUntil: string | null): boolean {
  if (status !== 'SENT' || !validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}
