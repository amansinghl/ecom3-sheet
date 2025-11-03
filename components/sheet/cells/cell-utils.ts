import { RowHeight } from '@/lib/store/sheet-store';

export function getCellTextSize(rowHeight: RowHeight): string {
  switch (rowHeight) {
    case 'compact':
      return 'text-xs';
    case 'spacious':
      return 'text-base';
    default:
      return 'text-sm';
  }
}

export function getCellPadding(rowHeight: RowHeight): string {
  switch (rowHeight) {
    case 'compact':
      return 'px-2 py-0.5';
    case 'spacious':
      return 'px-3 py-3';
    default:
      return 'px-3 py-2';
  }
}

