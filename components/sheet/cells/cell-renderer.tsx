'use client';

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

interface CellRendererProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function CellRenderer({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
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
    default:
      return <TextCell {...cellProps} />;
  }
}
