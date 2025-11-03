import { RowData, SheetConfig } from '@/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

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
