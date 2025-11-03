'use client';

import { useState, useRef, useEffect } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface TextCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function TextCell({
  value,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: TextCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue)}
        className={cn(
          'h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary',
          textSizeClass
        )}
      />
    );
  }

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
      {value || ''}
    </div>
  );
}
