'use client';

import { useState, useRef, useEffect } from 'react';
import { RowHeight } from '@/lib/store/sheet-store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface UrlCellProps {
  value: any;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function UrlCell({
  value,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: UrlCellProps) {
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

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="url"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue)}
        className="h-full w-full rounded-none border-0 focus-visible:ring-2 focus-visible:ring-primary"
      />
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full px-3 py-2 text-sm flex items-center gap-2 truncate',
        canEdit && 'cursor-text hover:bg-muted/50'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value && (
        <>
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        </>
      )}
    </div>
  );
}
