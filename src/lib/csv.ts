/**
 * Minimal RFC-4180 CSV reader.
 *
 * The browser only SPLITS the text — it never interprets a cell. Coercion, item
 * matching and rate resolution all happen on the server (`POST
 * quotations/import/preview`), so an import obeys the same "the server decides"
 * rule as every other write path. That split also means no multipart upload:
 * the file never leaves the browser as a file, so the generic `/api/proxy`
 * (which forwards `req.text()`) does not need to handle binary bodies.
 *
 * Hand-rolled rather than a dependency — the frontend currently ships zero
 * runtime deps beyond next/react, and this format is small and fully specified.
 */
export function parseCsv(input: string): string[][] {
  // Excel writes a UTF-8 BOM; it would otherwise corrupt the first header.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  row.push(field);
  rows.push(row);

  // Trailing newlines and spacer rows are normal in hand-edited spreadsheets.
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Columns the importer understands. Anything else in the file is ignored. */
export const CSV_COLUMNS = [
  'item',
  'description',
  'qty',
  'unit',
  'rate',
  'discount',
  'remarks',
] as const;

export class CsvFormatError extends Error {}

/**
 * Turns parsed rows into one object per data row, keyed by column name.
 * Column ORDER does not matter and unknown columns are ignored, so a file with
 * extra bookkeeping columns still imports.
 */
export function csvToRows(text: string): Record<string, string>[] {
  const grid = parseCsv(text);
  if (grid.length === 0) throw new CsvFormatError('That file is empty.');

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const known = header.filter((h) => (CSV_COLUMNS as readonly string[]).includes(h));
  if (known.length === 0) {
    throw new CsvFormatError(
      `No recognised column headings. The first row must name the columns — expected some of: ${CSV_COLUMNS.join(', ')}. Download the sample file to see the format.`,
    );
  }
  if (grid.length === 1) {
    throw new CsvFormatError('That file has headings but no rows.');
  }

  return grid.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    header.forEach((h, i) => {
      if ((CSV_COLUMNS as readonly string[]).includes(h)) out[h] = (cells[i] ?? '').trim();
    });
    return out;
  });
}
