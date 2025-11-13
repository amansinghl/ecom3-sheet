'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Search, FileDown, Plus, Settings, SplitSquareVertical, Eye, EyeOff, Download, FileSpreadsheet, RefreshCw, Sliders, ArrowUpNarrowWide, ArrowDownWideNarrow, Rows3, Upload, Pin, PinOff } from 'lucide-react';
import { useSheetStore, RowHeight } from '@/lib/store/sheet-store';
import { SheetConfig, RowData, UserRole } from '@/types';
import { exportToCSV, exportToExcel } from '@/lib/utils/export';
import { Badge } from '@/components/ui/badge';

interface ToolbarProps {
  config: SheetConfig;
  data: RowData[];
  userRole: UserRole;
  onAddRow?: () => void;
  onDeleteRows?: () => void;
  onBulkUpload?: () => void;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onOpenCommandPalette?: () => void;
}

export interface ToolbarRef {
  focusSearch: () => void;
}

export const Toolbar = forwardRef<ToolbarRef, ToolbarProps>(({ config, data, userRole, onAddRow, onDeleteRows, onBulkUpload, columnVisibility = {}, onColumnVisibilityChange, onOpenCommandPalette }, ref) => {
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      // Open command palette instead of focusing search
      if (onOpenCommandPalette) {
        onOpenCommandPalette();
      }
    },
  }));
  const { 
    viewState, 
    selectedRows, 
    clearSelection,
    rowHeight,
    setRowHeight,
    toggleColumnPin,
  } = useSheetStore();

  const canEdit = config.permissions?.[userRole]?.canEdit ?? false;
  const canExport = config.permissions?.[userRole]?.canExport ?? false;
  const canDelete = config.permissions?.[userRole]?.canDelete ?? false;

  const handleExportCSV = () => {
    // If rows are selected, export only selected rows
    // Otherwise, export the filtered data (excluding empty rows)
    let dataToExport = data;
    
    if (selectedRows.size > 0) {
      // Filter to only selected rows and exclude empty rows
      dataToExport = data.filter(
        (row) => selectedRows.has(row.id) && !(row as any)._isEmpty
      );
    } else {
      // Exclude empty rows from export
      dataToExport = data.filter((row) => !(row as any)._isEmpty);
    }
    
    exportToCSV(dataToExport, config, `${config.name}.csv`);
  };

  const handleExportExcel = () => {
    // If rows are selected, export only selected rows
    // Otherwise, export the filtered data (excluding empty rows)
    let dataToExport = data;
    
    if (selectedRows.size > 0) {
      // Filter to only selected rows and exclude empty rows
      dataToExport = data.filter(
        (row) => selectedRows.has(row.id) && !(row as any)._isEmpty
      );
    } else {
      // Exclude empty rows from export
      dataToExport = data.filter((row) => !(row as any)._isEmpty);
    }
    
    exportToExcel(dataToExport, config, `${config.name}.xlsx`);
  };

  const toggleColumnVisibility = (columnId: string) => {
    if (onColumnVisibilityChange) {
      const newVisibility = {
        ...columnVisibility,
        [columnId]: columnVisibility[columnId] === false ? true : false,
      };
      onColumnVisibilityChange(newVisibility);
    }
  };

  const visibleColumnsCount = config.columns.filter(col => columnVisibility[col.id] !== false).length;
  const selectedCount = selectedRows.size;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-border bg-background px-2 sm:px-3 py-1.5 animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
        {onOpenCommandPalette && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onOpenCommandPalette}
            className="h-7 w-full sm:max-w-xs justify-start text-muted-foreground min-w-0 text-xs px-2"
          >
            <Search className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline truncate">Search...</span>
            <span className="sm:hidden truncate">Search</span>
            <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
              ⌘K
            </kbd>
          </Button>
        )}

      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 border-r border-border pr-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {selectedCount} selected
            </span>
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={onDeleteRows} className="h-7 shrink-0 text-xs px-2">
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden">Del</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 shrink-0 text-xs px-2">
              Clear
            </Button>
          </div>
        )}

        {canEdit && onAddRow && (
          <Button size="sm" onClick={onAddRow} className="h-7 shrink-0 text-xs px-2">
            <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Add Row</span>
          </Button>
        )}

        {canEdit && onBulkUpload && config.id === 'escalations' && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onBulkUpload} 
            className="h-7 shrink-0 text-xs px-2"
          >
            <Upload className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
        )}

        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs px-2">
              <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
              {/* <span className="hidden sm:inline">Columns</span> */}
              <Badge variant="secondary" className="ml-1 sm:ml-1.5 h-4 px-1 text-[9px]">
                {visibleColumnsCount}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[400px] overflow-y-auto">
            <div className="px-2 py-1.5 text-sm font-semibold">Toggle columns</div>
            <DropdownMenuSeparator />
            {config.columns.map((col) => {
              const isVisible = columnVisibility[col.id] !== false;
              const isPinned = viewState.pinnedColumns.includes(col.id);
              return (
                <DropdownMenuItem
                  key={col.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnVisibility(col.id);
                    }}
                    className="flex items-center gap-2 flex-1 hover:bg-transparent"
                  >
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-left">{col.label}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnPin(col.id);
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title={isPinned ? 'Unpin column' : 'Pin column'}
                  >
                    {isPinned ? (
                      <PinOff className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex h-7 shrink-0 text-xs px-2">
              <SplitSquareVertical className="mr-1.5 h-3.5 w-3.5" />
              {/* Row Height */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={rowHeight} onValueChange={(val) => setRowHeight(val as RowHeight)}>
              <DropdownMenuRadioItem value="compact">
                <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
                Compact
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="comfortable">
                <Rows3 className="mr-2 h-4 w-4" />
                Comfortable
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="spacious">
                <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                Spacious
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs px-2">
                <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                {/* <span className="hidden sm:inline">Export</span> */}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 px-0">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Sliders className="mr-2 h-4 w-4" />
              View Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
