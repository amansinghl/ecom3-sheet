import { ColumnFilter, RowData, ColumnConfig } from '@/types';
import { matchesHighlightsFilter } from './highlights';

// Helper function to compute status value for LSD sheet status column
function computeStatusValue(row: RowData, columnId: string, sheetId?: string): any {
  if (columnId === 'status' && sheetId === 'lsd') {
    const amountToCustomer = row.credit_note_amount_to_customer;
    const refundAmount = row.credit_note_refund_amount;
    
    // Convert to numbers for comparison, handling null/undefined/empty strings
    const amount1 = amountToCustomer != null && amountToCustomer !== '' 
      ? parseFloat(String(amountToCustomer)) 
      : null;
    const amount2 = refundAmount != null && refundAmount !== '' 
      ? parseFloat(String(refundAmount)) 
      : null;
    
    // If both values are null/empty, return null (blank)
    if (amount1 === null && (amount2 === null || amount2 === 0)) {
      return null;
    }
    
    // If refund amount is 0 or NULL, return UNPAID
    if (amount2 === null || amount2 === 0) {
      return 'UNPAID';
    }
    
    // If amount to customer is null, return UNPAID
    if (amount1 === null) {
      return 'UNPAID';
    }
    
    // If refund amount is less than amount to customer, return PARTIALLY PAID
    if (amount2 < amount1) {
      return 'PARTIALLY PAID';
    }
    
    // If refund amount is greater than or equal to amount to customer, return PAID
    return 'PAID';
  }
  
  // For other columns, return the raw value
  return row[columnId];
}

export function applyFilters(
  data: RowData[],
  columnFilters: Record<string, ColumnFilter>,
  columns: ColumnConfig[],
  sheetId?: string
): RowData[] {
  const filterKeys = Object.keys(columnFilters);
  if (filterKeys.length === 0) return data;

  return data.filter((row) => {
    // All column filters must match (AND logic)
    return filterKeys.every((columnId) => {
      const columnFilter = columnFilters[columnId];
      // Use helper function to get computed value for status column
      const value = computeStatusValue(row, columnId, sheetId);
      const column = columns.find((c) => c.id === columnId);

      // The Highlights column has no value of its own - it is composed of five
      // row fields, each filtered on its own (counts numerically, flags by
      // true/false).
      if (column?.type === 'highlights') {
        if (columnFilter.type === 'highlights' && columnFilter.highlights) {
          return matchesHighlightsFilter(row, columnFilter.highlights);
        }
        return true;
      }

      // Attachments (media) columns hold an array of media objects: string/number
      // comparisons are meaningless, so only emptiness checks are supported.
      if (column?.type === 'media') {
        const attachmentCount = Array.isArray(value) ? value.length : 0;
        if (columnFilter.type === 'condition' && columnFilter.condition) {
          if (columnFilter.condition.operator === 'isEmpty') return attachmentCount === 0;
          if (columnFilter.condition.operator === 'isNotEmpty') return attachmentCount > 0;
        }
        return true;
      }

      // Handle value-based filtering (show only selected values)
      if (columnFilter.type === 'values' && columnFilter.values) {
        if (value === null || value === undefined) {
          // Check if null/empty is in the selected values
          return columnFilter.values.some((v) => v === null || v === undefined || v === '');
        }
        const stringValue = String(value).toLowerCase();
        return columnFilter.values.some((v) => String(v).toLowerCase() === stringValue);
      }

      // Handle condition-based filtering
      if (columnFilter.type === 'condition' && columnFilter.condition) {
        const { operator, value: filterValue } = columnFilter.condition;

        // Handle null/undefined values
        if (value === null || value === undefined) {
          return operator === 'isEmpty';
        }

        // Check if both value and filterValue are numbers (even if column type is not defined)
        const isValueNumeric = typeof value === 'number' || !isNaN(Number(value));
        const isFilterValueNumeric = typeof filterValue === 'number' || !isNaN(Number(filterValue));
        const isNumericComparison = isValueNumeric && isFilterValueNumeric && (column?.type === 'number' || typeof value === 'number' || typeof filterValue === 'number');

        const stringValue = String(value).toLowerCase();
        // Use nullish coalescing to handle 0 correctly (0 || '' would be '')
        const filterValueString = String(filterValue ?? '').toLowerCase();

        switch (operator) {
          case 'equals':
            // Handle array of values for multi-select
            if (Array.isArray(filterValue)) {
              return filterValue.some((fv) => {
                const fvString = String(fv ?? '').toLowerCase();
                if (isNumericComparison) {
                  return Number(value) === Number(fv);
                }
                return stringValue === fvString;
              });
            }
            if (isNumericComparison) {
              return Number(value) === Number(filterValue);
            }
            return stringValue === filterValueString;

          case 'notEquals':
            // Handle array of values for multi-select
            if (Array.isArray(filterValue)) {
              // For "is not", return true if value is NOT in any of the selected values
              return !filterValue.some((fv) => {
                const fvString = String(fv ?? '').toLowerCase();
                if (isNumericComparison) {
                  return Number(value) === Number(fv);
                }
                return stringValue === fvString;
              });
            }
            if (isNumericComparison) {
              return Number(value) !== Number(filterValue);
            }
            return stringValue !== filterValueString;

          case 'contains':
            return stringValue.includes(filterValueString);

          case 'notContains':
            return !stringValue.includes(filterValueString);

          case 'startsWith':
            return stringValue.startsWith(filterValueString);

          case 'endsWith':
            return stringValue.endsWith(filterValueString);

          case 'greaterThan':
            if (column?.type === 'number') {
              return Number(value) > Number(filterValue);
            }
            if (column?.type === 'date' || column?.type === 'datetime') {
              return new Date(value) > new Date(filterValue);
            }
            return false;

          case 'lessThan':
            if (column?.type === 'number') {
              return Number(value) < Number(filterValue);
            }
            if (column?.type === 'date' || column?.type === 'datetime') {
              return new Date(value) < new Date(filterValue);
            }
            return false;

          case 'isEmpty':
            return value === null || value === undefined || stringValue === '';

          case 'isNotEmpty':
            return value !== null && value !== undefined && stringValue !== '';

          case 'isAnyOf':
            // filterValue should be an array
            const values = Array.isArray(filterValue) ? filterValue : [filterValue];
            return values.some((v) => String(v).toLowerCase() === stringValue);

          default:
            return true;
        }
      }

      return true;
    });
  });
}
