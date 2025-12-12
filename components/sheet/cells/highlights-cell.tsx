'use client';

import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';

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

  // Extract the four highlight values
  const highlights = [
    { label: 'Calls Count', value: rowData?.count_of_calls },
    { label: 'NDR Count', value: rowData?.count_of_ndr },
    { label: 'OTP Verified NDR', value: rowData?.otp_verified_ndr },
    { label: 'OTP Verified Delivery', value: rowData?.otp_verified_delivery },
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
        <div className="flex items-center gap-4 flex-wrap w-full">
          {visibleHighlights.map((highlight, index) => (
            <span
              key={`${highlight.label}-${index}`}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className={cn("text-muted-foreground", textSizeClass)}>
                {highlight.label}:
              </span>
              <span className={cn("font-medium", textSizeClass)}>
                {highlight.value}
              </span>
              {index < visibleHighlights.length - 1 && (
                <span className="text-muted-foreground/40 mx-1">-</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )}
    </div>
  );
}

