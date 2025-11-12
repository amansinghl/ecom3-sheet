'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Phone } from 'lucide-react';
import { RowHeight } from '@/lib/store/sheet-store';

interface PhoneCellProps {
  value: any;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function PhoneCell({
  value,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: PhoneCellProps) {
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
        type="tel"
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
        canEdit ? 'cursor-text hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value && (
        <>
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <a
            href={`tel:${value}`}
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
