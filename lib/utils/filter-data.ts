import { ColumnFilter, RowData, ColumnConfig } from '@/types';

export function applyFilters(
  data: RowData[],
  columnFilters: Record<string, ColumnFilter>,
  columns: ColumnConfig[]
): RowData[] {
  const filterKeys = Object.keys(columnFilters);
  if (filterKeys.length === 0) return data;

  return data.filter((row) => {
    // All column filters must match (AND logic)
    return filterKeys.every((columnId) => {
      const columnFilter = columnFilters[columnId];
      const value = row[columnId];
      const column = columns.find((c) => c.id === columnId);

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
            if (isNumericComparison) {
              return Number(value) === Number(filterValue);
            }
            return stringValue === filterValueString;

          case 'notEquals':
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
