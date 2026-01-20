'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';

interface TextCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  globalSearch?: string;
  initialValue?: string; // For direct typing - replaces value when entering edit mode
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export const TextCell = memo(function TextCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  globalSearch = '',
  initialValue,
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
      // If initialValue is provided (user typed directly), use it instead of current value
      const startValue = initialValue !== undefined ? initialValue : (value || '');
      setEditValue(startValue);
      currentValueRef.current = startValue;
      if (inputRef.current) {
        inputRef.current.focus();
        // If starting with initialValue, put cursor at the end instead of selecting all
        if (initialValue !== undefined) {
          const len = startValue.length;
          inputRef.current.setSelectionRange(len, len);
        } else {
          inputRef.current.select();
        }
      }
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, value, initialValue]);

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
          'h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary select-text',
          textSizeClass
        )}
      />
    );
  }

  // Format entry_month column as "January 2026" instead of "2026-01"
  let displayValue = value || '';
  if (columnConfig.id === 'entry_month' && displayValue) {
    try {
      // Parse "2026-01" format
      const [year, month] = displayValue.split('-');
      if (year && month) {
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        displayValue = `${monthNames[date.getMonth()]} ${year}`;
      }
    } catch (e) {
      // If parsing fails, use original value
    }
  }
  
  const highlightedValue = !isEditing && globalSearch.trim() 
    ? highlightText(displayValue, globalSearch.trim())
    : displayValue;

  return (
    <div
      className={cn(
        'h-full w-full truncate text-gray-900 font-semibold',
        textSizeClass,
        paddingClass,
        canEdit ? 'cursor-text hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {highlightedValue}
    </div>
  );
});
