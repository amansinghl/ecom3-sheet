'use client';

import { useState, useRef, useEffect } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';
import { formatOpsRemarkLog, splitOpsRemarkEntries } from '@/lib/utils/ops-remarks';

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

function formatDisplayValue(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    const json = JSON.stringify(value);
    return json ?? String(value);
  } catch {
    return String(value);
  }
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
  const [editValue, setEditValue] = useState(formatDisplayValue(value));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  const isOpsRemarks = columnConfig.id === 'ops_remarks';

  // Store the current typed value in a ref to persist across re-renders
  const currentValueRef = useRef('');
  
  // Track previous isEditing state to detect when editing starts
  const prevIsEditingRef = useRef(false);

  useEffect(() => {
    // Only sync when transitioning from not editing to editing
    if (isEditing && !prevIsEditingRef.current) {
      // OPS Remarks: type a new line in the input; the history is shown below it.
      const startValue = isOpsRemarks
        ? (initialValue !== undefined ? initialValue : '')
        : (initialValue !== undefined ? initialValue : formatDisplayValue(value));
      setEditValue(startValue);
      currentValueRef.current = startValue;
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (isOpsRemarks || initialValue !== undefined) {
          const len = startValue.length;
          textareaRef.current.setSelectionRange(len, len);
        } else {
          textareaRef.current.select();
        }
      }
    }
    // IMPORTANT: Don't reset editValue if value prop changes while editing
    // This prevents the input from being cleared when data updates during editing
    prevIsEditingRef.current = isEditing;
  }, [isEditing, initialValue, isOpsRemarks]);

  const commitRemark = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (isOpsRemarks && trimmed === '') {
      onCancel();
      return;
    }
    onSave(isOpsRemarks ? trimmed : inputValue);
  };

  const handleSave = () => {
    commitRemark(editValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter for new lines, but Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      commitRemark(currentValueRef.current || '');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    commitRemark(currentValueRef.current || '');
  };

  const displayValue = formatDisplayValue(value);
  const lines = isOpsRemarks
    ? splitOpsRemarkEntries(displayValue)
    : displayValue.split('\n').map((line) => line.trim()).filter(Boolean);
  // OPS Remarks are stored newest-first with a dotted separator. Other longtext
  // logs still append, so those cells reverse to show the latest line first.
  const isLog = lines.length > 1;
  const visibleValue = isOpsRemarks
    ? formatOpsRemarkLog(lines)
    : isLog
      ? [...lines].reverse().join('\n')
      : displayValue;
  const logClasses = rowHeight === 'compact'
    ? 'px-2 py-0.5 leading-tight whitespace-pre-line line-clamp-1'
    : 'px-3 py-0.5 leading-tight whitespace-pre-line line-clamp-2';
  const searchTerm = globalSearch.trim();
  const highlightedValue = searchTerm ? highlightText(visibleValue, searchTerm) : visibleValue;

  // Inline editing mode - render textarea directly in cell
  if (isEditing) {
    const remarkHistory = isOpsRemarks ? formatOpsRemarkLog(splitOpsRemarkEntries(displayValue)) : '';

    return (
      <div
        className={cn(
          'flex h-full w-full flex-col bg-white',
          isOpsRemarks && remarkHistory ? 'min-h-[140px]' : 'min-h-[60px]'
        )}
      >
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setEditValue(newValue);
            currentValueRef.current = newValue;
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            'w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary resize-none select-text',
            textSizeClass,
            isOpsRemarks && remarkHistory ? 'min-h-[44px] h-[44px]' : 'h-full min-h-[60px]'
          )}
          placeholder={isOpsRemarks ? 'Add a remark...' : 'Enter text...'}
        />
        {isOpsRemarks && remarkHistory ? (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              'min-h-0 flex-1 overflow-auto border-t border-dashed px-2 py-1 whitespace-pre-line text-gray-800',
              textSizeClass
            )}
          >
            {remarkHistory}
          </div>
        ) : null}
      </div>
    );
  }

  // Display mode - show value and allow click to edit
  return (
    <>
      <div
        title={isOpsRemarks ? formatOpsRemarkLog(lines) : isLog ? lines.join('\n') : displayValue}
        className={cn(
          'h-full w-full text-gray-900 font-semibold',
          textSizeClass,
          isLog ? logClasses : `${paddingClass} truncate`,
          canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
        )}
        onClick={() => canEdit && onEdit()}
      >
        {isLog && (
          <span
            className="mr-1 inline-block rounded bg-muted px-1 align-middle text-[10px] font-normal leading-4 text-muted-foreground"
            aria-label={`${lines.length} entries`}
          >
            {lines.length}
          </span>
        )}
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
