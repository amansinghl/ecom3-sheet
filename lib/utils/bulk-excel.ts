/**
 * Excel parsing shared by the KB bulk upload / bulk update flows.
 *
 * Pure helpers only - toasts and API calls stay in the component so this file
 * can be unit tested without React.
 */

import * as XLSX from 'xlsx';

/**
 * Thrown once the user has already been told what is wrong with the file, so
 * the caller can rethrow without showing a second, generic toast.
 */
export class BulkFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkFileError';
  }
}

/** Parsed sheet: `rows[0]` is the header row, the rest are data rows. */
export type ExcelRows = unknown[][];

/** Row of the first sheet as a raw array of cells; empty cells are `null`. */
export async function readFirstSheet(file: File): Promise<ExcelRows> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as ExcelRows;
}

/**
 * "AWB No (or VSID)", "awb_no_or_vsid" and "AWB NO OR VSID" all collapse to
 * "awbnoorvsid" so aliases only need to be listed once, in any spelling.
 */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Index of the first header matching one of `aliases`. When nothing matches
 * and `fallbackIndex` is given, that column is used instead - so a sheet whose
 * headers were renamed still works as long as the sample's column order kept.
 * The fallback is skipped when that column is already `taken` by another
 * field, so a sheet missing one column never feeds its neighbour's values in.
 */
export function findColumnIndex(
  headers: string[],
  aliases: readonly string[],
  fallbackIndex?: number,
  taken: readonly number[] = []
): number {
  const wanted = new Set(aliases.map(normalizeHeader));
  const matched = headers.findIndex((header) => wanted.has(header));

  if (matched !== -1) return matched;
  if (fallbackIndex !== undefined && fallbackIndex < headers.length && !taken.includes(fallbackIndex)) {
    return fallbackIndex;
  }
  return -1;
}

/**
 * Columns that have no header at all, to the right of every named column.
 * Text typed there is taken as OPS Remarks: it is the only free-text field,
 * and a remark landing one column past the header is the common slip.
 */
export function headerlessColumnIndexes(headers: string[], namedIndexes: number[]): number[] {
  const lastNamed = Math.max(-1, ...namedIndexes);
  return headers
    .map((header, index) => (header === '' && index > lastNamed ? index : -1))
    .filter((index) => index !== -1);
}

/** Trimmed cell text; `''` for an empty cell. */
export function cellText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

/**
 * Shipment number or AWB as typed in the sheet. Excel hands numeric cells back
 * as numbers (so `String()` is safe up to 2^53) and thousand-separated text as
 * "1,234,567"; both have to reach the API as "1234567".
 */
export function cellIdentifier(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? String(value) : null;
  }

  const text = cellText(value).replace(/,/g, '');
  return text === '' ? null : text;
}

/** A row the API skipped, addressed by its Excel row number. */
export interface RejectedRow {
  row: number;
  reason: string;
}

/**
 * The API reports errors by 1-based position in the payload it received, but
 * blank rows are dropped before sending, so that position is not the Excel row.
 * `excelRows[i]` is the Excel row number of payload entry `i`.
 */
export function toRejectedRows(
  errors: Record<string, string[]> | undefined,
  excelRows: number[]
): RejectedRow[] {
  return Object.entries(errors ?? {}).map(([position, reasons]) => ({
    row: excelRows[Number(position) - 1] ?? Number(position),
    reason: reasons.join(', '),
  }));
}

/** Header aliases accepted on the KB bulk sheets, in any spelling/casing. */
export const KB_SHEET_COLUMNS = {
  identifier: ['awb or vsid', 'awb no or vsid', 'awb', 'awb no', 'vsid', 'shipment no'],
  manualCase: ['manual case'],
  notes: ['notes'],
  sourceOfComplaint: ['source of complaint'],
  emailSubject: ['email subject'],
  opsRemarks: ['ops remarks', 'ops remark', 'remarks'],
} as const;

/** Header row of the downloadable bulk update sample; each label is an alias above. */
export const KB_UPDATE_SAMPLE_HEADERS = ['AWB OR VSID', 'Email Subject', 'OPS Remarks'] as const;
