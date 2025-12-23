'use client';

import { memo } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { TextCell } from './text-cell';
import { NumberCell } from './number-cell';
import { DateCell } from './date-cell';
import { DropdownCell } from './dropdown-cell';
import { CheckboxCell } from './checkbox-cell';
import { StatusCell } from './status-cell';
import { UserCell } from './user-cell';
import { EmailCell } from './email-cell';
import { PhoneCell } from './phone-cell';
import { UrlCell } from './url-cell';
import { LongTextCell } from './longtext-cell';
import { HighlightsCell } from './highlights-cell';

interface CellRendererProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  rowData?: any; // Full row data for highlights cell
  globalSearch?: string;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

// Custom comparison function to prevent unnecessary re-renders
function arePropsEqual(prev: CellRendererProps, next: CellRendererProps): boolean {
  // Always re-render if editing state changes
  if (prev.isEditing !== next.isEditing) return false;
  
  // Re-render if value changes
  if (prev.value !== next.value) return false;
  
  // Re-render if edit permission changes
  if (prev.canEdit !== next.canEdit) return false;
  
  // Re-render if row height changes
  if (prev.rowHeight !== next.rowHeight) return false;
  
  // Re-render if global search changes (only when not editing)
  if (!next.isEditing && prev.globalSearch !== next.globalSearch) return false;
  
  // Column config changes rarely, check by id
  if (prev.columnConfig.id !== next.columnConfig.id) return false;
  
  // For highlights cell, check rowData
  if (next.columnConfig.type === 'highlights' && prev.rowData !== next.rowData) return false;
  
  // Don't check callback references - they're stable from parent
  return true;
}

export const CellRenderer = memo(function CellRenderer({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  rowData,
  globalSearch = '',
  onEdit,
  onSave,
  onCancel,
}: CellRendererProps) {
  const cellProps = {
    value,
    columnConfig,
    isEditing,
    canEdit,
    rowHeight,
    globalSearch,
    onEdit,
    onSave,
    onCancel,
  };

  switch (columnConfig.type) {
    case 'text':
      return <TextCell {...cellProps} />;
    case 'longtext':
      return <LongTextCell {...cellProps} />;
    case 'number':
      return <NumberCell {...cellProps} />;
    case 'date':
    case 'datetime':
      return <DateCell {...cellProps} />;
    case 'dropdown':
    case 'multiselect':
      return <DropdownCell {...cellProps} />;
    case 'checkbox':
      return <CheckboxCell {...cellProps} />;
    case 'status':
      return <StatusCell {...cellProps} />;
    case 'user':
      return <UserCell {...cellProps} />;
    case 'email':
      return <EmailCell {...cellProps} />;
    case 'phone':
      return <PhoneCell {...cellProps} />;
    case 'url':
      return <UrlCell {...cellProps} />;
    case 'highlights':
      return <HighlightsCell {...cellProps} rowData={rowData} />;
    default:
      return <TextCell {...cellProps} />;
  }
}, arePropsEqual);
