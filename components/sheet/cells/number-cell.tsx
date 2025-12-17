'use client';

import { useState, useRef, useEffect } from 'react';
import { RowHeight } from '@/lib/store/sheet-store';
import { ColumnConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';

interface NumberCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  globalSearch?: string;
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
  globalSearch = '',
  onEdit,
  onSave,
  onCancel,
}: NumberCellProps) {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  
  // Store the current typed value in a ref to persist across re-renders
  // Initialize with empty string, NOT with editValue (which changes on re-renders)
  const currentValueRef = useRef('');

  // Track previous isEditing state to detect when editing starts
  const prevIsEditingRef = useRef(false);
  
  useEffect(() => {
    // Only sync when transitioning from not editing to editing
    if (isEditing && !prevIsEditingRef.current) {
      const initialValue = value?.toString() || '';
      setEditValue(initialValue);
      currentValueRef.current = initialValue;
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, value]);

  // Check if this is shipment_no column (for multiple shipment support)
  const isShipmentNoColumn = columnConfig.id === 'shipment_no';
  
  // Check if value contains comma or space (multiple shipments)
  const containsMultipleValues = (val: string): boolean => {
    if (!val) return false;
    return /[,\s]/.test(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const inputValue = editValue.trim();
      if (inputValue === '') {
        onSave(null);
      } else if (isShipmentNoColumn && containsMultipleValues(inputValue)) {
        // For shipment_no with multiple values, pass as string
        onSave(inputValue);
      } else {
        // Single number value
        const numValue = Number(inputValue);
        onSave(isNaN(numValue) ? null : numValue);
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Use the actual DOM input value which is the source of truth
    // This handles cases where the component remounts during editing
    const inputValue = (inputRef.current?.value || currentValueRef.current || '').trim();
    if (inputValue === '') {
      onSave(null);
    } else if (isShipmentNoColumn && containsMultipleValues(inputValue)) {
      // For shipment_no with multiple values, pass as string
      onSave(inputValue);
    } else {
      // Single number value
      const numValue = Number(inputValue);
      onSave(isNaN(numValue) ? null : numValue);
    }
  };

  if (isEditing) {
    // Use text input for shipment_no to allow comma/space separated values
    // Use number input for other number columns
    const inputType = isShipmentNoColumn ? 'text' : 'number';
    
    return (
      <Input
        ref={inputRef}
        type={inputType}
        value={editValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setEditValue(newValue);
          currentValueRef.current = newValue; // Store in ref immediately
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={isShipmentNoColumn ? "e.g., 123456, 789012" : undefined}
        className={cn(
          'h-full w-full rounded-none border-0 text-right focus-visible:ring-2 focus-visible:ring-primary',
          inputType === 'number' && '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
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

  const highlightedValue = !isEditing && globalSearch.trim() 
    ? highlightText(formattedValue, globalSearch.trim())
    : formattedValue;

  return (
    <div
      className={cn(
        'h-full w-full text-right truncate tabular-nums text-gray-900',
        textSizeClass,
        paddingClass,
        canEdit ? 'cursor-text hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {highlightedValue}
    </div>
  );
}
