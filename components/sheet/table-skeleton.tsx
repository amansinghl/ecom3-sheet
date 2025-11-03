'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 10, columns = 8 }: TableSkeletonProps) {
  // Deterministic widths for skeleton cells
  const getSkeletonWidth = (rowIndex: number, colIndex: number) => {
    const widths = [60, 70, 80, 65, 75, 85, 70, 80];
    return widths[(rowIndex + colIndex) % widths.length];
  };

  return (
    <div className="w-full overflow-auto rounded-md border border-border bg-background">
      <table className="w-full border-collapse">
        {/* Header Skeleton */}
        <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
          <tr className="border-b border-border">
            {/* Checkbox column */}
            <th className="h-10 w-[60px] border-r border-border px-3">
              <Skeleton className="h-4 w-4 mx-auto" />
            </th>
            {/* Data columns */}
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="h-10 border-r border-border px-3">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        {/* Body Skeleton */}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'border-b border-border',
                rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'
              )}
            >
              {/* Checkbox column */}
              <td className="h-10 w-[60px] border-r border-border px-3">
                <Skeleton className="h-4 w-4 mx-auto" />
              </td>
              {/* Data columns */}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="h-10 border-r border-border px-3">
                  <Skeleton 
                    className="h-4" 
                    style={{ 
                      width: `${getSkeletonWidth(rowIndex, colIndex)}%` 
                    }} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
