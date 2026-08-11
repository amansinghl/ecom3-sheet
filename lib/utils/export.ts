import { RowData, SheetConfig } from '@/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Attachments (media) columns hold an array of media objects. Stringifying them
 * would emit "[object Object]" / raw JSON, so emit one URL per line instead.
 */
export function formatMediaCellValue(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => (item && typeof item === 'object' ? item.url : item))
    .filter((url) => typeof url === 'string' && url.length > 0)
    .join('\n');
}

export function exportToCSV(data: RowData[], config: SheetConfig, filename: string) {
  // Get column headers
  const headers = config.columns.map((col) => col.label);
  const columnIds = config.columns.map((col) => col.id);

  // Format data
  const rows = data.map((row) => {
    return columnIds.map((colId) => {
      const value = row[colId];
      const column = config.columns.find((c) => c.id === colId);

      // Format based on type
      if (value === null || value === undefined) return '';
      
      if (column?.type === 'date' || column?.type === 'datetime') {
        const date = value instanceof Date ? value : new Date(value);
        return format(date, column.type === 'datetime' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
      }

      if (column?.type === 'media') {
        return formatMediaCellValue(value);
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return value;
    });
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function exportToExcel(data: RowData[], config: SheetConfig, filename: string) {
  // Get column headers
  const headers = config.columns.map((col) => col.label);
  const columnIds = config.columns.map((col) => col.id);

  // Format data
  const rows = data.map((row) => {
    const formattedRow: any = {};
    columnIds.forEach((colId, idx) => {
      const value = row[colId];
      const column = config.columns.find((c) => c.id === colId);
      const header = headers[idx];

      // Format based on type
      if (value === null || value === undefined) {
        formattedRow[header] = '';
      } else if (column?.type === 'date' || column?.type === 'datetime') {
        const date = value instanceof Date ? value : new Date(value);
        formattedRow[header] = format(
          date,
          column.type === 'datetime' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd'
        );
      } else if (column?.type === 'media') {
        formattedRow[header] = formatMediaCellValue(value);
      } else if (typeof value === 'object') {
        formattedRow[header] = JSON.stringify(value);
      } else {
        formattedRow[header] = value;
      }
    });
    return formattedRow;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.name);

  // Download
  XLSX.writeFile(wb, filename);
}
