'use client';

import { useState, useRef, useEffect } from 'react';
import { RowHeight } from '@/lib/store/sheet-store';
import { ColumnConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface NumberCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function NumberCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: NumberCellProps) {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const numValue = editValue === '' ? null : Number(editValue);
      onSave(numValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          const numValue = editValue === '' ? null : Number(editValue);
          onSave(numValue);
        }}
        className={cn(
          'h-full w-full rounded-none border-0 text-right focus-visible:ring-2 focus-visible:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          textSizeClass
        )}
      />
    );
  }

  // Check if this is an ID column (ends with _id or _no)
  const isIdColumn = columnConfig.id.endsWith('_id') || columnConfig.id.endsWith('_no');
  
  // Format number: use toLocaleString() for regular numbers, plain toString() for IDs
  const formattedValue = value !== null && value !== undefined
    ? (isIdColumn ? value.toString() : value.toLocaleString())
    : '';

  return (
    <div
      className={cn(
        'h-full w-full text-right truncate tabular-nums',
        textSizeClass,
        paddingClass,
        canEdit && 'cursor-text hover:bg-muted/50'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {formattedValue}
    </div>
  );
}
