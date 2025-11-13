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
  
  // Store the current typed value in a ref to persist across re-renders
  // Initialize with empty string, NOT with editValue (which changes on re-renders)
  const currentValueRef = useRef('');

  // Track previous isEditing state to detect when editing starts
  const prevIsEditingRef = useRef(false);
  
  useEffect(() => {
    // Only sync when transitioning from not editing to editing
    if (isEditing && !prevIsEditingRef.current) {
      const initialValue = value || '';
      setEditValue(initialValue);
      currentValueRef.current = initialValue;
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Use the ref value which persists across re-renders
    const inputValue = currentValueRef.current || '';
    onSave(inputValue);
  };

  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setEditValue(newValue);
          currentValueRef.current = newValue; // Store in ref immediately
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
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
        canEdit ? 'cursor-text hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value || ''}
    </div>
  );
}
