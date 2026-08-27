// New Diamond Corporation brand constants + document helpers.
// Colours/type per brand-kit/README.txt. Printed documents are ALWAYS this
// palette — they never follow the app's light/dark theme tokens.

export const BRAND = {
  navy: '#12263A', // steel navy — headings, rules, table header, total bar
  brass: '#B07A2B', // accent — hub of the mark, "ORIGINAL FOR RECIPIENT"
  grey: '#5B6673', // secondary text
  greyLight: '#7C8794', // labels, row numbers
  body: '#4A5561', // body copy
  line: '#E8E8E2', // hairlines
  zebra: '#F7F7F4', // alternating row fill
  paper: '#FFFFFF',
  tagline: 'VALVES · PIPES · FITTINGS',
} as const;

// Payment terms derived from the gap between issue and due date — the model
// has no `terms` field, so this is computed, not stored.
export function paymentTerms(
  issueDate: string,
  dueDate: string | null | undefined,
): string | null {
  if (!dueDate) return null;
  const days = Math.round(
    (new Date(dueDate).getTime() - new Date(issueDate).getTime()) / 86_400_000,
  );
  if (days <= 0) return 'Due on receipt';
  return `Net ${days}`;
}

export function longDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty',
  'Ninety',
];

function under1000(n: number): string {
  const out: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) out.push(`${ONES[hundreds]} Hundred`);
  if (rest < 20) {
    if (rest) out.push(ONES[rest]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    out.push(o ? `${TENS[t]}-${ONES[o]}` : TENS[t]);
  }
  return out.join(' ');
}

// South-Asian grouping (crore / lakh / thousand) — the convention for PKR.
function groupWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  if (crore) parts.push(`${groupWords(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (n) parts.push(under1000(n));
  return parts.join(' ');
}

// "Amount in words" line on the invoice. Money arrives as a Decimal string.
export function amountInWords(
  value: string | number | null | undefined,
  currency = 'PKR',
): string {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw)) return '';
  const negative = raw < 0;
  const abs = Math.abs(raw);

  let whole = Math.floor(abs);
  let fraction = Math.round((abs - whole) * 100);
  if (fraction === 100) {
    whole += 1;
    fraction = 0;
  }

  const unit = currency === 'PKR' ? 'Rupees' : currency;
  const subUnit = currency === 'PKR' ? 'Paisa' : 'Cents';

  let words = `${unit} ${groupWords(whole)}`;
  if (fraction) words += ` and ${subUnit} ${under1000(fraction)}`;
  if (negative) words = `Minus ${words}`;
  return `${words} only`;
}
