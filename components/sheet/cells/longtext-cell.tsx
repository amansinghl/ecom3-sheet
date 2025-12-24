'use client';

import { useState, useRef, useEffect } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';

interface LongTextCellProps {
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

export function LongTextCell({
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
}: LongTextCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  // Store the current typed value in a ref to persist across re-renders
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
      if (textareaRef.current) {
        textareaRef.current.focus();
        // If starting with initialValue, put cursor at the end instead of selecting all
        if (initialValue !== undefined) {
          const len = startValue.length;
          textareaRef.current.setSelectionRange(len, len);
        } else {
          textareaRef.current.select();
        }
      }
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, value, initialValue]);

  const handleSave = () => {
    onSave(editValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter for new lines, but Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const inputValue = currentValueRef.current || '';
      onSave(inputValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Use the ref value which persists across re-renders
    const inputValue = currentValueRef.current || '';
    onSave(inputValue);
  };

  const displayValue = value || '';
  const highlightedValue = !isEditing && globalSearch.trim() 
    ? highlightText(displayValue, globalSearch.trim())
    : displayValue;

  // Inline editing mode - render textarea directly in cell
  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setEditValue(newValue);
          currentValueRef.current = newValue; // Store in ref immediately
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          'h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary resize-none select-text',
          textSizeClass,
          'min-h-[60px]'
        )}
        placeholder="Enter text..."
      />
    );
  }

  // Display mode - show value and allow click to edit
  return (
    <>
      <div
        className={cn(
          'h-full w-full truncate text-gray-900 font-semibold',
          textSizeClass,
          paddingClass,
          canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
        )}
        onClick={() => canEdit && onEdit()}
      >
        {highlightedValue}
      </div>

      {/* Keep dialog as fallback for non-inline editing scenarios if needed */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[200px]"
            placeholder="Enter text..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
