import {
  HighlightsFilterValue,
  HighlightsNumberCondition,
  NumericFilterOperator,
  RowData,
} from '@/types';

// The Highlights column has no value of its own - it is rendered from these
// row fields (see components/sheet/cells/highlights-cell.tsx), so its filter
// works on them directly.
export const HIGHLIGHT_NUMBER_FIELDS = [
  { id: 'count_of_calls', label: 'Calls' },
  { id: 'count_of_ndr', label: 'NDR' },
] as const;

export const HIGHLIGHT_BOOLEAN_FIELDS = [
  { id: 'otp_verified_ndr', label: 'OTP NDR' },
  { id: 'otp_verified_delivery', label: 'OTP Del' },
  { id: 'is_cancelled', label: 'Cancelled' },
] as const;

export type HighlightNumberField = (typeof HIGHLIGHT_NUMBER_FIELDS)[number]['id'];
export type HighlightBooleanField = (typeof HIGHLIGHT_BOOLEAN_FIELDS)[number]['id'];

export const NUMERIC_FILTER_OPERATORS: { value: NumericFilterOperator; label: string }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
];

// The backend sends these flags as 0/1, but tolerate booleans and strings too.
// A missing value means "not verified" / "not cancelled", i.e. false.
export function toHighlightBoolean(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'n' || normalized === 'no') {
    return false;
  }
  return true;
}

// Counts arrive as numbers or numeric strings; anything missing counts as 0.
export function toHighlightNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesNumberCondition(value: unknown, condition: HighlightsNumberCondition): boolean {
  const rowValue = toHighlightNumber(value);
  const target = Number(condition.value);
  if (!Number.isFinite(target)) return true;

  switch (condition.operator) {
    case '=':
      return rowValue === target;
    case '!=':
      return rowValue !== target;
    case '>':
      return rowValue > target;
    case '>=':
      return rowValue >= target;
    case '<':
      return rowValue < target;
    case '<=':
      return rowValue <= target;
    default:
      return true;
  }
}

// Every sub-condition that is set must match (AND logic).
export function matchesHighlightsFilter(row: RowData, filter: HighlightsFilterValue): boolean {
  for (const field of HIGHLIGHT_NUMBER_FIELDS) {
    const condition = filter[field.id];
    if (condition && !matchesNumberCondition(row[field.id], condition)) {
      return false;
    }
  }

  for (const field of HIGHLIGHT_BOOLEAN_FIELDS) {
    const expected = filter[field.id];
    if (expected !== undefined && toHighlightBoolean(row[field.id]) !== expected) {
      return false;
    }
  }

  return true;
}

export function isHighlightsFilterEmpty(filter?: HighlightsFilterValue): boolean {
  if (!filter) return true;
  const hasNumber = HIGHLIGHT_NUMBER_FIELDS.some((field) => filter[field.id] !== undefined);
  const hasBoolean = HIGHLIGHT_BOOLEAN_FIELDS.some((field) => filter[field.id] !== undefined);
  return !hasNumber && !hasBoolean;
}

// Short text for the active-filter chip in the toolbar, e.g. "Calls > 3, Cancelled: true"
export function summarizeHighlightsFilter(filter?: HighlightsFilterValue): string {
  if (!filter) return '';

  const parts: string[] = [];

  HIGHLIGHT_NUMBER_FIELDS.forEach((field) => {
    const condition = filter[field.id];
    if (condition) {
      parts.push(`${field.label} ${condition.operator} ${condition.value}`);
    }
  });

  HIGHLIGHT_BOOLEAN_FIELDS.forEach((field) => {
    const expected = filter[field.id];
    if (expected !== undefined) {
      parts.push(`${field.label}: ${expected}`);
    }
  });

  return parts.join(', ');
}
