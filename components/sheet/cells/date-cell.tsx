'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface DateCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function DateCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: DateCellProps) {
  const isDateTime = columnConfig.type === 'datetime';
  const inputType = isDateTime ? 'datetime-local' : 'date';
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  const formatValue = (val: any) => {
    if (!val) return '';
    const date = val instanceof Date ? val : new Date(val);
    if (isDateTime) {
      return format(date, "yyyy-MM-dd'T'HH:mm");
    }
    return format(date, 'yyyy-MM-dd');
  };

  const [editValue, setEditValue] = useState(formatValue(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(editValue ? new Date(editValue) : null);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={inputType}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue ? new Date(editValue) : null)}
        className={cn(
          'h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary',
          textSizeClass
        )}
      />
    );
  }

  const displayValue = value
    ? format(
        value instanceof Date ? value : new Date(value),
        isDateTime ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy'
      )
    : '';

  return (
    <div
      className={cn(
        'h-full w-full truncate',
        textSizeClass,
        paddingClass,
        canEdit && 'cursor-text hover:bg-muted/50'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {displayValue}
    </div>
  );
}
