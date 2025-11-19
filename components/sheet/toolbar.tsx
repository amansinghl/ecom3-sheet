'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, FileDown, Plus, Info, SplitSquareVertical, Eye, EyeOff, Download, FileSpreadsheet, RefreshCw, Sliders, ArrowUpNarrowWide, ArrowDownWideNarrow, Rows3, Upload, Pin, PinOff, X } from 'lucide-react';
import { useSheetStore, RowHeight } from '@/lib/store/sheet-store';
import { SheetConfig, RowData, UserRole } from '@/types';
import { exportToCSV, exportToExcel } from '@/lib/utils/export';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ToolbarProps {
  config: SheetConfig;
  data: RowData[];
  userRole: UserRole;
  onAddRow?: () => void;
  onDeleteRows?: () => void;
  onBulkUpload?: () => void;
  onRefresh?: () => void;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onOpenCommandPalette?: () => void;
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
  visibleRowCount?: number;
  activeViewId?: string;
}

export interface ToolbarRef {
  focusSearch: () => void;
}

export const Toolbar = forwardRef<ToolbarRef, ToolbarProps>(({ config, data, userRole, onAddRow, onDeleteRows, onBulkUpload, onRefresh, columnVisibility = {}, onColumnVisibilityChange, onOpenCommandPalette, globalSearch = '', onGlobalSearchChange, visibleRowCount = 0, activeViewId }, ref) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={globalSearch}
            onChange={(e) => onGlobalSearchChange?.(e.target.value)}
            placeholder="Search all columns..."
            className="h-8 pl-7 pr-12 text-xs"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => onGlobalSearchChange?.('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
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

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Total: {visibleRowCount}
          </span>
          {onRefresh && config.id === 'escalations' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRefresh} 
              className="h-7 shrink-0 text-xs px-2"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>

        {canEdit && onAddRow && (
          <Button 
            size="sm" 
            onClick={onAddRow} 
            className="h-7 shrink-0 text-xs px-2"
            disabled={config.id === 'escalations' && activeViewId === 'closed'}
          >
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

        {config.id === 'escalations' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 shrink-0 px-0"
            onClick={() => setShowInfoDialog(true)}
            title="Auto-Closure Logic Info"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Escalation Sheet Auto-Closure Logic</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-6 text-sm">
              {/* Overview */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base text-foreground">Overview</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The system automatically closes escalation tickets based on shipment tracking status changes. 
                  Tickets are marked as either <span className="font-medium text-green-600 dark:text-green-400">Positive Closure</span> (resolved successfully) 
                  or <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure</span> (resolved but with unfavorable outcome).
                </p>
              </div>

              {/* Closure Rules */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base text-foreground">Closure Rules by Case Type</h3>
                
                {/* Rule 1 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">1. Fake NDR Remark / Delivery Issue / Re-Attempt</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking status = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> (Delivered)
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking status &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> (RTO/Failed states)
                    </p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">2. Delayed RTO</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking status = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">2030</code> (RTO Delivered)
                    </p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">3. Reverse Pickup / Delayed Pickup</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking status ≥ <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code> (In Transit or beyond)
                    </p>
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">4. Reverse Delivery Issue</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking status = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> (Delivered)
                    </p>
                  </div>
                </div>

                {/* Rule 5 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">5. COD Delay</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> When <code className="px-1.5 py-0.5 rounded bg-background border text-xs">paid_amount</code> ≥ <code className="px-1.5 py-0.5 rounded bg-background border text-xs">cod_value</code> (full COD amount received)
                    </p>
                  </div>
                </div>

                {/* Rule 6 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">6. EDD Breach / EDD Urgent</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> When shipment reaches status <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> (Delivered) 
                      or <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1770</code> (Out for Delivery) after escalation was created
                    </p>
                  </div>
                </div>
              </div>

              {/* Automation Details */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="font-semibold text-base text-foreground">Automation Details</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Frequency:</span>
                    <span className="text-muted-foreground">Runs every 15 minutes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Scope:</span>
                    <span className="text-muted-foreground">Only processes tickets with <code className="px-1.5 py-0.5 rounded bg-background border text-xs">auto_ticket_status = 'Open'</code> and <code className="px-1.5 py-0.5 rounded bg-background border text-xs">is_closed = 0</code></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Ticket Delay:</span>
                    <span className="text-muted-foreground">Automatically calculated as days between ticket creation and current date/closure</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground italic">
                  This logic ensures escalation tickets are automatically resolved when the underlying issue is addressed, reducing manual intervention.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
