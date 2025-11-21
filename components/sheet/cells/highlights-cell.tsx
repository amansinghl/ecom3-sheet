'use client';

import { useState, useRef } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  // Extract the four highlight values
  const highlights = [
    { label: 'Count of Calls', value: rowData?.count_of_calls },
    { label: 'Count of NDR', value: rowData?.count_of_ndr },
    { label: 'OTP Verified NDR', value: rowData?.otp_verified_ndr },
    { label: 'OTP Verified Delivery', value: rowData?.otp_verified_delivery },
  ];

  // Filter out null/undefined/empty string values
  const visibleHighlights = highlights.filter(
    (h) => h.value !== null && h.value !== undefined && h.value !== ''
  );

  // Show first highlight in cell, or count if multiple
  const displayValue = visibleHighlights.length > 0 
    ? visibleHighlights.length === 1
      ? `${visibleHighlights[0].label}: ${visibleHighlights[0].value}`
      : `${visibleHighlights.length} highlights`
    : null;

  const handleMouseEnter = () => {
    if (visibleHighlights.length > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100); // Small delay to allow moving to popover
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'h-full w-full flex items-center gap-1.5',
            textSizeClass,
            paddingClass,
            visibleHighlights.length > 0 && 'cursor-pointer hover:bg-muted/50 transition-colors',
            visibleHighlights.length === 0 && 'cursor-default'
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {displayValue ? (
            <>
              <span className="truncate flex-1">{displayValue}</span>
              {visibleHighlights.length > 1 && (
                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      </PopoverTrigger>
      {visibleHighlights.length > 0 && (
        <PopoverContent
          className="w-64 p-3"
          side="right"
          align="start"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="space-y-2">
            <div className="text-sm font-semibold mb-2 pb-2 border-b">
              Highlights
            </div>
            {visibleHighlights.map((highlight, index) => (
              <div
                key={`${highlight.label}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm text-muted-foreground">
                  {highlight.label}:
                </span>
                <span className="text-sm font-medium">{highlight.value}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

