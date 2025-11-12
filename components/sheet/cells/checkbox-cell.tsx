'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { RowHeight } from '@/lib/store/sheet-store';

interface CheckboxCellProps {
  value: any;
  canEdit: boolean;
  rowHeight: RowHeight;
  onSave: (value: any) => void;
}

export function CheckboxCell({ value, canEdit,
  rowHeight, onSave }: CheckboxCellProps) {
  const checked = Boolean(value);

  return (
    <div
      className={cn(
        'h-full w-full px-3 py-2 flex items-center justify-center',
        canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(checked) => canEdit && onSave(checked)}
        disabled={!canEdit}
      />
    </div>
  );
}
