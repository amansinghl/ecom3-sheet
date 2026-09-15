'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';
import { formatOpsRemarkLog, splitOpsRemarkEntries, parseOpsRemarkParts, OPS_REMARK_SEPARATOR } from '@/lib/utils/ops-remarks';

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

function OpsRemarkList({
  entries,
  searchTerm = '',
  compact = false,
}: {
  entries: string[];
  searchTerm?: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      {entries.map((entry, index) => {
        const { header, body } = parseOpsRemarkParts(entry);
        return (
          <div key={`${header}-${index}`} className={index > 0 ? 'mt-1' : undefined}>
            {index > 0 && (
              <div className="mb-1 text-[9px] font-normal leading-none text-gray-400">
                {OPS_REMARK_SEPARATOR}
              </div>
            )}
            {header ? (
              <div className={cn('font-normal text-gray-500', compact ? 'text-[9px] leading-tight' : 'text-[10px] leading-tight')}>
                {searchTerm ? highlightText(header, searchTerm) : header}
              </div>
            ) : null}
            <div className={cn('font-normal text-gray-900', compact ? 'text-xs leading-tight' : 'text-sm leading-snug')}>
              {searchTerm ? highlightText(body, searchTerm) : body}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const cellRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBox, setPreviewBox] = useState<{
    left: number;
    maxWidth: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);
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
  const opsEntries = isOpsRemarks ? splitOpsRemarkEntries(displayValue) : [];
  const lines = isOpsRemarks
    ? opsEntries
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
    ? 'px-2 py-0.5 leading-tight overflow-hidden whitespace-pre-line line-clamp-1'
    : 'px-3 py-0.5 leading-tight overflow-hidden whitespace-pre-line line-clamp-2';
  const searchTerm = globalSearch.trim();
  const highlightedValue = searchTerm ? highlightText(visibleValue, searchTerm) : visibleValue;
  const previewText = isOpsRemarks
    ? formatOpsRemarkLog(lines)
    : isLog
      ? lines.join('\n')
      : displayValue;
  const compactRemarks = rowHeight === 'compact';

  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const placePreview = useCallback(() => {
    const cell = cellRef.current;
    if (!cell || !previewText) return false;

    const viewport = cell.closest('[data-sheet-viewport]') as HTMLElement | null;
    const cellRect = cell.getBoundingClientRect();
    const viewRect = viewport?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const gap = 4;
    const maxWidth = Math.max(160, Math.min(384, viewRect.width - 16));
    const spaceBelow = viewRect.bottom - cellRect.bottom - gap;
    const spaceAbove = cellRect.top - viewRect.top - gap;
    const placeBelow = spaceBelow >= 72 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(48, Math.min(256, placeBelow ? spaceBelow : spaceAbove));
    let left = cellRect.left;
    if (left + maxWidth > viewRect.right - 8) left = viewRect.right - 8 - maxWidth;
    if (left < viewRect.left + 8) left = viewRect.left + 8;

    setPreviewBox(
      placeBelow
        ? { top: cellRect.bottom + gap, left, maxWidth, maxHeight }
        : { bottom: window.innerHeight - cellRect.top + gap, left, maxWidth, maxHeight }
    );
    return true;
  }, [previewText]);

  const openPreview = useCallback(() => {
    if (placePreview()) setShowPreview(true);
  }, [placePreview]);

  useEffect(() => {
    if (isEditing) setShowPreview(false);
  }, [isEditing]);

  useEffect(() => {
    if (!showPreview || isEditing) return;

    const isPointerOverRow = (x: number, y: number) => {
      const row = cellRef.current?.closest('tr');
      if (!row) return false;
      const rect = row.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isPointerOverRow(event.clientX, event.clientY)) {
        closePreview();
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    return () => document.removeEventListener('pointermove', onPointerMove);
  }, [showPreview, isEditing, closePreview]);

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
        {isOpsRemarks && opsEntries.length > 0 ? (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="min-h-0 flex-1 overflow-auto border-t border-dashed px-2 py-1 text-gray-800"
          >
            <OpsRemarkList entries={opsEntries} />
          </div>
        ) : null}
      </div>
    );
  }

  const cellContent = (
    <div
      ref={cellRef}
      className={cn(
        'h-full w-full text-gray-500',
        isOpsRemarks ? 'font-normal' : 'font-semibold',
        textSizeClass,
        isOpsRemarks || isLog ? logClasses : `${paddingClass} truncate`,
        canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onPointerEnter={previewText ? openPreview : undefined}
      onClick={() => canEdit && onEdit()}
    >
      {isOpsRemarks && opsEntries.length > 0 ? (
        <OpsRemarkList entries={opsEntries.slice(0, 1)} searchTerm={searchTerm} compact={compactRemarks} />
      ) : (
        <>
          {isLog && (
            <span
              className="mr-1 inline-block rounded bg-muted px-1 align-middle text-[10px] font-normal leading-4 text-muted-foreground"
              aria-label={`${lines.length} entries`}
            >
              {lines.length}
            </span>
          )}
          {highlightedValue}
        </>
      )}
    </div>
  );

  return (
    <>
      {cellContent}
      {showPreview && previewText && previewBox && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[200] overflow-auto border border-gray-300 bg-white p-2 text-black"
              style={{
                left: previewBox.left,
                top: previewBox.top,
                bottom: previewBox.bottom,
                maxWidth: previewBox.maxWidth,
                maxHeight: previewBox.maxHeight,
              }}
            >
              {isOpsRemarks ? <OpsRemarkList entries={opsEntries} /> : previewText}
            </div>,
            document.body
          )
        : null}

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
