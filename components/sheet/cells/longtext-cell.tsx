'use client';

import { useState } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface LongTextCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function LongTextCell({
  value,
  canEdit,
  rowHeight,
  onSave,
}: LongTextCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  const handleSave = () => {
    onSave(editValue);
    setIsOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'h-full w-full truncate',
          textSizeClass,
          paddingClass,
          canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
        )}
        onClick={() => canEdit && setIsOpen(true)}
      >
        {value || ''}
      </div>

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
