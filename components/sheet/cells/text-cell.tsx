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

function formatDisplayValue(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  // Prevent React runtime errors by converting object/array cell values to text.
  try {
    const json = JSON.stringify(value);
    return json ?? String(value);
  } catch {
    return String(value);
  }
}

function extractEstimatedDeliveryDate(value: any): string {
  if (value == null) return '';

  let parsed: any = value;
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (!trimmed) return '';
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  if (typeof parsed !== 'object') {
    return String(parsed);
  }

  if (typeof parsed.estimated_delivery_date === 'string') {
    return parsed.estimated_delivery_date;
  }

  // Handles payloads like: { "306301294": { "estimated_delivery_date": "..." } }
  for (const nestedValue of Object.values(parsed)) {
    if (
      nestedValue &&
      typeof nestedValue === 'object' &&
      typeof (nestedValue as any).estimated_delivery_date === 'string'
    ) {
      return (nestedValue as any).estimated_delivery_date;
    }
  }

  return formatDisplayValue(parsed);
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
  const [editValue, setEditValue] = useState(formatDisplayValue(value));
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
      const startValue = initialValue !== undefined ? initialValue : formatDisplayValue(value);
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
    // IMPORTANT: Don't reset editValue if value prop changes while editing
    // This prevents the input from being cleared when data updates during editing
    prevIsEditingRef.current = isEditing;
  }, [isEditing, initialValue]); // Removed 'value' from dependencies to prevent reset during editing

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
  let displayValue = formatDisplayValue(value);
  if (columnConfig.id === 'edd') {
    displayValue = extractEstimatedDeliveryDate(value);
  }
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
