'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { money } from '@/lib/format';
import type { Item, Party, Quotation } from '@/lib/types';
import { Button, Card, ErrorText, Field, Input, LinkButton, Select, Textarea } from '@/components/ui';
import { CsvFormatError, csvToRows } from '@/lib/csv';

interface EditorLine {
  key: number;
  itemId: string;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
  /** No rate yet — prints in its own section and is excluded from the totals. */
  ratePending: boolean;
  rateNote: string;
  /** Set when the line came from a CSV row the server could not fully match. */
  importNote?: string;
}

/** One CSV row after the server resolved it. Mirrors ResolvedImportRow. */
interface ImportedRow {
  index: number;
  status: 'matched' | 'text' | 'pending' | 'error';
  message?: string;
  itemId?: string;
  catalogPrice?: string;
  description: string;
  qty: number;
  unitPrice?: number;
  discount: number;
  ratePending: boolean;
  rateNote?: string;
}

interface ImportResult {
  rows: ImportedRow[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    pending: number;
    errors: number;
  };
}

const num = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const today = () => new Date().toISOString().slice(0, 10);

const blankLine = (key: number): EditorLine => ({
  key,
  itemId: '',
  description: '',
  qty: '1',
  unitPrice: '0',
  discount: '0',
  ratePending: false,
  rateNote: '',
});

export default function QuotationEditor({ quotation }: { quotation?: Quotation }) {
  const router = useRouter();
  const editing = !!quotation;
  const keyRef = useRef(0);
  const nextKey = () => ++keyRef.current;

  const [customers, setCustomers] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [partyId, setPartyId] = useState(quotation?.partyId ?? '');
  const [issueDate, setIssueDate] = useState(quotation?.issueDate?.slice(0, 10) ?? today());
  const [validUntil, setValidUntil] = useState(quotation?.validUntil?.slice(0, 10) ?? '');
  const [subject, setSubject] = useState(quotation?.subject ?? '');
  const [notes, setNotes] = useState(quotation?.notes ?? '');
  const [quotationDiscount, setQuotationDiscount] = useState(
    quotation ? String(Number(quotation.quotationDiscount)) : '0',
  );
  const [lines, setLines] = useState<EditorLine[]>(
    quotation?.lines.length
      ? quotation.lines.map((l) => ({
          key: nextKey(),
          itemId: l.itemId ?? '',
          description: l.description,
          qty: String(Number(l.qty)),
          // A pending line has no price to show; seed the input with 0 so
          // un-ticking the box lands on a usable field.
          unitPrice: l.unitPrice === null ? '0' : String(Number(l.unitPrice)),
          discount: String(Number(l.discount)),
          ratePending: l.unitPrice === null,
          rateNote: l.rateNote ?? '',
        }))
      : [blankLine(nextKey())],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportResult['summary'] | null>(null);
  const [failedRows, setFailedRows] = useState<ImportedRow[]>([]);

  useEffect(() => {
    api.get<Party[]>('parties?type=CUSTOMER').then(setCustomers);
    api.get<Item[]>('items').then(setItems);
  }, []);

  /**
   * Read the file, have the server resolve it, then drop the rows straight into
   * the line boxes below. Nothing is created — the imported lines are ordinary
   * editable lines, saved through the same "Create draft" button as typed ones.
   */
  async function runImport(file: File) {
    setImportError(null);
    setImportSummary(null);
    setFailedRows([]);
    setImporting(true);
    try {
      const rows = csvToRows(await file.text());
      const res = await api.post<ImportResult>('quotations/import/preview', { rows });

      // A row the server could not resolve has no usable qty or rate, so it is
      // reported rather than inserted as a broken line to be hunted down later.
      const usable = res.rows.filter((r) => r.status !== 'error');
      const failed = res.rows.filter((r) => r.status === 'error');
      setFailedRows(failed);

      if (usable.length === 0) {
        setImportError('No usable rows in that file.');
        return;
      }

      const imported: EditorLine[] = usable.map((r) => ({
        key: nextKey(),
        itemId: r.itemId ?? '',
        description: r.description,
        qty: String(r.qty),
        unitPrice: r.unitPrice !== undefined ? String(r.unitPrice) : '0',
        discount: String(r.discount),
        ratePending: r.ratePending,
        rateNote: r.rateNote ?? '',
        importNote: r.message,
      }));

      // Untouched blank lines (the one the editor starts with) are replaced;
      // anything already typed is kept and the import appends after it.
      const isBlank = (l: EditorLine) => !l.itemId && !l.description.trim();
      setLines((ls) => [...ls.filter((l) => !isBlank(l)), ...imported]);
      setImportSummary(res.summary);
    } catch (e) {
      setImportError(
        e instanceof CsvFormatError || e instanceof Error ? e.message : 'Import failed',
      );
    } finally {
      setImporting(false);
    }
  }

  function updateLine(key: number, patch: Partial<EditorLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickItem(key: number, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateLine(key, {
        itemId,
        description: item.name,
        unitPrice: String(Number(item.defaultSalePrice)),
      });
    } else {
      updateLine(key, { itemId: '' });
    }
  }

  /** The catalog's own price for a linked item, for the "List …" hint. */
  function catalogPrice(l: EditorLine): number | null {
    if (!l.itemId) return null;
    const item = items.find((i) => i.id === l.itemId);
    return item ? Number(item.defaultSalePrice) : null;
  }

  // Unpriced lines contribute nothing — same rule the server applies.
  const lineTotal = (l: EditorLine) =>
    l.ratePending ? 0 : num(l.qty) * num(l.unitPrice) - num(l.discount);
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const grandTotal = subtotal - num(quotationDiscount);
  const pendingCount = lines.filter((l) => l.ratePending).length;

  async function save() {
    setError(null);
    if (!partyId) return setError('Choose a customer');
    if (lines.length === 0) return setError('Add at least one line');
    setSaving(true);
    const payload = {
      partyId,
      issueDate,
      validUntil: validUntil || undefined,
      subject: subject || undefined,
      notes: notes || undefined,
      quotationDiscount: num(quotationDiscount),
      lines: lines.map((l) =>
        l.ratePending
          ? {
              // Price and discount are deliberately omitted: the server stores
              // them as NULL / 0 and keeps the line out of the totals.
              itemId: l.itemId || undefined,
              description: l.description,
              qty: num(l.qty),
              ratePending: true,
              rateNote: l.rateNote || undefined,
            }
          : {
              itemId: l.itemId || undefined,
              description: l.description,
              qty: num(l.qty),
              unitPrice: num(l.unitPrice),
              discount: num(l.discount),
            },
      ),
    };
    try {
      const saved = editing
        ? await api.patch<Quotation>(`quotations/${quotation!.id}`, payload)
        : await api.post<Quotation>('quotations', payload);
      router.push(`/quotations/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <Select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject (optional)">
            <Input
              value={subject}
              placeholder="e.g. Supply of gate valves — Plant 2"
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
          <Field label="Quotation date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Valid until (optional)" hint="Quoted rates hold until this date.">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-fg">Import lines from a CSV</div>
            <p className="mt-0.5 text-xs text-muted">
              Rows drop into the lines below, where you can edit them before saving. Columns may
              be in any order; extra columns are ignored.
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              <li>
                <code className="text-fg">item</code> — matched to your catalog by name. Leave it
                blank for a free-text line.
              </li>
              <li>
                <code className="text-fg">rate</code> — blank takes the price set in the system
                (needs a matching <code className="text-fg">item</code>);{' '}
                <code className="text-fg">TBD</code> quotes it with no rate yet.
              </li>
              <li>
                <code className="text-fg">qty</code> defaults to 1 ·{' '}
                <code className="text-fg">discount</code> is an amount, not a percentage ·{' '}
                <code className="text-fg">remarks</code> applies to{' '}
                <code className="text-fg">TBD</code> rows.
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/quotation-template.csv"
              download
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-hover"
            >
              Download sample
            </a>
            <Button
              type="button"
              variant="secondary"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? 'Importing…' : 'Choose CSV file'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                // Cleared so picking the same file again still fires onChange.
                e.target.value = '';
                if (f) void runImport(f);
              }}
            />
          </div>
        </div>

        {importSummary && (
          <div className="mt-3 rounded-md bg-hover px-3 py-2 text-xs text-fg">
            Added {importSummary.total - importSummary.errors} line
            {importSummary.total - importSummary.errors === 1 ? '' : 's'} —{' '}
            {importSummary.matched} matched to catalog items, {importSummary.unmatched} kept as
            free text, {importSummary.pending} pending rate.
          </div>
        )}
        {failedRows.length > 0 && (
          <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            <div className="font-medium">
              {failedRows.length} row{failedRows.length === 1 ? '' : 's'} skipped:
            </div>
            <ul className="mt-1 list-disc pl-4">
              {failedRows.map((r) => (
                <li key={r.index}>
                  Row {r.index}: {r.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {importError && <p className="mt-2 text-xs text-red-600">{importError}</p>}
      </Card>

      <div className="relative">
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="pb-2 font-medium">Item / description</th>
              <th className="w-20 pb-2 text-right font-medium">Qty</th>
              <th className="w-32 pb-2 text-right font-medium">Unit price</th>
              <th className="w-24 pb-2 text-right font-medium">Discount</th>
              <th className="w-28 pb-2 text-right font-medium">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const cp = catalogPrice(l);
              return (
                <tr key={l.key} className="border-t border-line">
                  <td className="py-2 pr-2">
                    <Select
                      value={l.itemId}
                      onChange={(e) => pickItem(l.key, e.target.value)}
                      className="mt-0 mb-1"
                    >
                      <option value="">Free text…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={l.description}
                      placeholder="Description"
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                      className="mt-0"
                    />
                    {l.importNote && (
                      <p className="mt-1 text-[11px] text-amber-600">{l.importNote}</p>
                    )}
                    <label className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={l.ratePending}
                        onChange={(e) => updateLine(l.key, { ratePending: e.target.checked })}
                      />
                      Rate not entered yet
                    </label>
                    {l.ratePending && (
                      <Input
                        value={l.rateNote}
                        placeholder="Remarks — e.g. awaiting supplier confirmation"
                        onChange={(e) => updateLine(l.key, { rateNote: e.target.value })}
                        className="mt-1"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                      className="mt-0 text-right"
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    {l.ratePending ? (
                      <div className="pt-2 text-right text-xs text-amber-600">Pending</div>
                    ) : (
                      <>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                          className="mt-0 text-right"
                        />
                        {/* The catalog price, so quoting off-list is a visible choice. */}
                        {cp !== null && (
                          <div className="mt-0.5 text-right text-[11px] text-muted">
                            List {money(cp)}
                            {num(l.unitPrice) !== cp && (
                              <span className="text-amber-600"> · changed</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    {l.ratePending ? (
                      <div className="pt-2 text-right text-muted">—</div>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.discount}
                        onChange={(e) => updateLine(l.key, { discount: e.target.value })}
                        className="mt-0 text-right"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right align-top tabular-nums text-fg">
                    {l.ratePending ? <span className="text-muted">—</span> : money(lineTotal(l))}
                  </td>
                  <td className="py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      className="text-muted hover:text-red-600"
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, blankLine(nextKey())])}
          className="mt-3 text-sm font-medium text-fg hover:underline"
        >
          + Add line
        </button>
      </Card>

        {/* Held over the lines area, which is what the import is filling in. */}
        {importing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-surface/85">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent"
              role="status"
              aria-label="Importing"
            />
            <p className="text-sm text-muted">Reading your file and matching items…</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Card>
          <Field label="Notes">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-72" />
          </Field>
        </Card>
        <div className="ml-auto w-72">
          <Card>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-muted">
                <dt>Quotation discount</dt>
                <dd>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quotationDiscount}
                    onChange={(e) => setQuotationDiscount(e.target.value)}
                    className="mt-0 w-28 text-right"
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-fg">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(grandTotal)}</dd>
              </div>
              {pendingCount > 0 && (
                <p className="pt-1 text-xs text-amber-600">
                  Excludes {pendingCount} item{pendingCount > 1 ? 's' : ''} pending rate.
                </p>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save draft' : 'Create draft'}
        </Button>
        <LinkButton
          href={editing ? `/quotations/${quotation!.id}` : '/quotations'}
          variant="secondary"
        >
          Cancel
        </LinkButton>
      </div>
      <p className="text-xs text-muted">
        Totals are recalculated on the server when you save. Issue the quotation from its detail page
        to lock it and assign a number.
      </p>
    </div>
  );
}
