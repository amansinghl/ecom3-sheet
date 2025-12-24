'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Phone } from 'lucide-react';
import { RowHeight } from '@/lib/store/sheet-store';
import { highlightText } from './cell-utils';

interface PhoneCellProps {
  value: any;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  globalSearch?: string;
  initialValue?: string; // For direct typing - replaces value when entering edit mode
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function PhoneCell({
  value,
  isEditing,
  canEdit,
  rowHeight,
  globalSearch = '',
  initialValue,
  onEdit,
  onSave,
  onCancel,
}: PhoneCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsEditingRef = useRef(false);

  useEffect(() => {
    // Only sync when transitioning from not editing to editing
    if (isEditing && !prevIsEditingRef.current) {
      // If initialValue is provided (user typed directly), use it instead of current value
      const startValue = initialValue !== undefined ? initialValue : (value || '');
      setEditValue(startValue);
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

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="tel"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue)}
        className="h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary select-text"
      />
    );
  }

  const highlightedValue = !isEditing && value && globalSearch.trim()
    ? highlightText(value, globalSearch.trim())
    : value;

  return (
    <div
      className={cn(
        'h-full w-full px-3 py-2 text-sm flex items-center gap-2 truncate',
        canEdit ? 'cursor-text hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value && (
        <>
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <a
            href={`tel:${value}`}
            className="text-gray-900 font-semibold hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {highlightedValue}
          </a>
        </>
      )}
    </div>
  );
}
