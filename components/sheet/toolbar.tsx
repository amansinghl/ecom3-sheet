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
import { Search, FileDown, Plus, Info, SplitSquareVertical, Eye, EyeOff, Download, FileSpreadsheet, RefreshCw, Sliders, ArrowUpNarrowWide, ArrowDownWideNarrow, Rows3, Upload, Pin, PinOff, X, GripVertical, Layers, Check, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react';
import { useSheetStore, RowHeight } from '@/lib/store/sheet-store';
import { SheetConfig, RowData, UserRole, ColumnConfig } from '@/types';
import { exportToCSV, exportToExcel } from '@/lib/utils/export';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable column item component
interface SortableColumnItemProps {
  column: ColumnConfig;
  isVisible: boolean;
  isPinned: boolean;
  onToggleVisibility: () => void;
  onTogglePin: () => void;
}

function SortableColumnItem({ column, isVisible, isPinned, onToggleVisibility, onTogglePin }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-muted rounded-sm cursor-default"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {/* Toggle visibility */}
      <button
        onClick={onToggleVisibility}
        className="flex items-center gap-2 flex-1 hover:bg-transparent text-left"
      >
        {isVisible ? (
          <Eye className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 text-sm truncate">{column.label}</span>
      </button>
      
      {/* Pin toggle */}
      <button
        onClick={onTogglePin}
        className="p-1 rounded hover:bg-accent transition-colors shrink-0"
        title={isPinned ? 'Unpin column' : 'Pin column'}
      >
        {isPinned ? (
          <PinOff className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Pin className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

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
    columnOrder,
    setColumnOrder,
    groupByColumn,
    setGroupByColumn,
    collapsedGroups,
    collapseAllGroups,
    expandAllGroups,
  } = useSheetStore();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get ordered columns for the dropdown
  const getOrderedColumns = () => {
    const orderedCols = columnOrder.length > 0 
      ? columnOrder
          .map(id => config.columns.find(c => c.id === id))
          .filter((col): col is ColumnConfig => col !== undefined)
      : config.columns;
    
    // Add any new columns not in the order
    const orderedIds = new Set(columnOrder);
    const newCols = config.columns.filter(c => !orderedIds.has(c.id));
    
    return [...orderedCols, ...newCols];
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const orderedCols = getOrderedColumns();
      const oldIndex = orderedCols.findIndex(col => col.id === active.id);
      const newIndex = orderedCols.findIndex(col => col.id === over.id);
      
      const newOrder = arrayMove(orderedCols.map(c => c.id), oldIndex, newIndex);
      setColumnOrder(newOrder);
    }
  };

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onRefresh} 
                  className="h-7 shrink-0 text-xs px-2"
                >
                  <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          )}
        </div>

        {canEdit && onAddRow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                onClick={onAddRow} 
                className="h-7 shrink-0 text-xs px-2"
                disabled={config.id === 'escalations' && activeViewId === 'closed'}
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new row</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs px-2">
                  <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                  <Badge variant="secondary" className="ml-1 sm:ml-1.5 h-4 px-1 text-[9px]">
                    {visibleColumnsCount}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Column visibility</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-hidden">
            <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              Drag to reorder columns
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[320px]">
              <div className="p-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={getOrderedColumns().map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getOrderedColumns().map((col) => (
                      <SortableColumnItem
                        key={col.id}
                        column={col}
                        isVisible={columnVisibility[col.id] !== false}
                        isPinned={viewState.pinnedColumns.includes(col.id)}
                        onToggleVisibility={() => toggleColumnVisibility(col.id)}
                        onTogglePin={() => toggleColumnPin(col.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex h-7 shrink-0 text-xs px-2">
                  <SplitSquareVertical className="mr-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Row height</TooltipContent>
          </Tooltip>
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

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={groupByColumn ? "default" : "outline"} 
                  size="sm" 
                  className="hidden sm:flex h-7 shrink-0 text-xs px-2"
                >
                  <Layers className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden lg:inline">
                    {groupByColumn ? config.columns.find(c => c.id === groupByColumn)?.label || 'Group' : 'Group'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Group by column</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem 
              onClick={() => setGroupByColumn(null)}
              className={!groupByColumn ? 'bg-accent' : ''}
            >
              <X className="mr-2 h-4 w-4" />
              No Grouping
              {!groupByColumn && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Group by column
            </div>
            {config.columns
              .filter(col => ['dropdown', 'status', 'text', 'user'].includes(col.type))
              .map(col => (
                <DropdownMenuItem 
                  key={col.id}
                  onClick={() => setGroupByColumn(col.id)}
                  className={groupByColumn === col.id ? 'bg-accent' : ''}
                >
                  {col.label}
                  {groupByColumn === col.id && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))
            }
            {groupByColumn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const uniqueValues = [...new Set(
                    data
                      .filter(row => !(row as any)._isEmpty)
                      .map(row => {
                        const val = row[groupByColumn];
                        return val != null && val !== '' ? String(val) : '(No Value)';
                      })
                  )];
                  collapseAllGroups(uniqueValues);
                }}>
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Collapse All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => expandAllGroups()}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Expand All
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {canEdit && onBulkUpload && config.id === 'escalations' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onBulkUpload} 
                className="h-7 shrink-0 text-xs px-2"
              >
                <Upload className="h-3.5 w-3.5 sm:mr-1.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bulk upload</TooltipContent>
          </Tooltip>
        )}

        {canExport && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs px-2">
                    <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                    {/* <span className="hidden sm:inline">Export</span> */}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export data</TooltipContent>
            </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 shrink-0 px-0"
                onClick={() => setShowInfoDialog(true)}
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto-closure logic info</TooltipContent>
          </Tooltip>
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
                  <h4 className="font-medium text-foreground">1. Delivery Issue</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">2. Delayed Pickup</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking ≥ <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &lt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code> till 10 days of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">3. Reverse Pickup</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking ≥ <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &lt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code> till 10 days of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">4. Fake NDR Remark</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 5 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">5. EDD - URGENT</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> or becomes <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1770</code> after ticket creation
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 5 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">6. EDD - Breach</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code> or becomes <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1770</code> after ticket creation
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 6 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">7. Re-attempt</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking Status = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 7 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">8. POD (Proof of Delivery) within 48 hrs.</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Manual Closure:</span> To be manually closed only by the Ticket creator
                    </p>
                  </div>
                </div>

                {/* Rule 8 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">9. RTO the Shipment</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 9 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">10. Lost/ Damaged</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1500</code> or <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1550</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking doesn't change to <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1500</code> or <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1550</code> after 2 months of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 10 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">11. Self-collection</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 11 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">12. Delayed RTO</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">2030</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking doesn't become <code className="px-1.5 py-0.5 rounded bg-background border text-xs">2030</code> after 2 months of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 12 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">13. Address/ Contact No Update</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 13 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">14. Reverse Delivery Issues</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> No tracking change after 2 months of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 14 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">15. Service Failure</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Manual Closure:</span> To be manually closed only by the Ticket creator
                    </p>
                  </div>
                </div>

                {/* Rule 15 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">16. Wrong Delivery</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1500</code> or <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1550</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> No tracking change after 2 months of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 16 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">17. Post-Pickup Dispute</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking ≥ <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &lt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1200</code> till 10 days of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 17 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">18. COD to Prepaid Change</h4>
                  <div className="pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> <code className="px-1.5 py-0.5 rounded bg-background border text-xs">COD_value</code> becomes <code className="px-1.5 py-0.5 rounded bg-background border text-xs">0</code> for the shipment
                    </p>
                  </div>
                </div>

                {/* Rule 18 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">19. Wrong RTO</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1500</code> or <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1550</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> No tracking change after 2 months of ticket creation
                    </p>
                  </div>
                </div>

                {/* Rule 19 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">20. Misrouted Shipment</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking &gt; <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                  </div>
                </div>

                {/* Rule 20 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-foreground">21. Revoke RTO</h4>
                  <div className="space-y-1 pl-4">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-green-600 dark:text-green-400">Positive Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">1900</code>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Negative Closure:</span> Tracking = <code className="px-1.5 py-0.5 rounded bg-background border text-xs">2030</code>
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
