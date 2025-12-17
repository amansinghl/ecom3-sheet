'use client';

import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';
import { Badge } from '@/components/ui/badge';

interface HighlightsCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  rowData?: any; // Full row data to access the highlight fields
  globalSearch?: string;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function HighlightsCell({
  rowData,
  rowHeight,
  canEdit,
}: HighlightsCellProps) {
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  // Extract the four highlight values with shorter labels
  const highlights = [
    { label: 'Calls', value: rowData?.count_of_calls },
    { label: 'NDR', value: rowData?.count_of_ndr },
    { label: 'OTP NDR', value: rowData?.otp_verified_ndr },
    { label: 'OTP Del', value: rowData?.otp_verified_delivery },
  ];

  // Filter out null/undefined/empty string values
  const visibleHighlights = highlights.filter(
    (h) => h.value !== null && h.value !== undefined && h.value !== ''
  );

  return (
    <div
      className={cn(
        'h-full w-full flex items-center',
        paddingClass
      )}
    >
      {visibleHighlights.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap w-full">
          {visibleHighlights.map((highlight, index) => (
            <Badge
              key={`${highlight.label}-${index}`}
              variant="outline"
              className={cn(
                "h-5 px-1.5 py-0 font-normal border-border/60",
                textSizeClass
              )}
            >
              <span className="text-muted-foreground/70 mr-0.5">
                {highlight.label}:
              </span>
              <span className="font-semibold text-foreground">
                {highlight.value}
              </span>
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )}
    </div>
  );
}

