'use client';

import { useState, useEffect, useRef } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DropdownCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function DropdownCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: DropdownCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const options = columnConfig.options || [];

  // Reset edit value when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditValue(value || '');
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isEditing, value]);

  const getLabel = (val: string) => {
    const option = options.find((opt) => opt.value === val);
    return option?.label || val || '';
  };

  if (isEditing) {
    return (
      <div className="p-1">
        <Select
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              // Close without selection - cancel edit
              onCancel();
            }
          }}
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val);
            setOpen(false);
            onSave(val);
          }}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full px-3 py-2 text-sm truncate',
        canEdit && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {getLabel(value)}
    </div>
  );
}
