'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SheetConfig, RowData, UserRole, ColumnFilter } from '@/types';
import { useSheetStore } from '@/lib/store/sheet-store';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CellRenderer } from './cells/cell-renderer';
import { RowContextMenu } from './row-context-menu';
import { EmptyState } from './empty-state';
import { ColumnFilterDropdown } from './column-filter-dropdown';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Filter, Pin, PinOff } from 'lucide-react';

interface DataGridProps {
  config: SheetConfig;
  data: RowData[];
  userRole: UserRole;
  onCellUpdate: (rowId: string, columnId: string, value: any) => void;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onDuplicateRow?: (rowId: string) => void;
  onCopyRow?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onAddRow?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  globalSearch?: string;
}

export function DataGrid({ config, data, userRole, onCellUpdate, columnVisibility: externalColumnVisibility, onColumnVisibilityChange, onDuplicateRow, onCopyRow, onDeleteRow, onAddRow, onClearFilters, hasActiveFilters, scrollContainerRef, globalSearch = '' }: DataGridProps) {
  const { selectedRows, toggleRowSelection, editingCell, setEditingCell, viewState, rowHeight, columnWidths, setColumnWidth, setColumnFilter, toggleColumnPin, selectedCellRange, setSelectedCellRange, clearCellSelection, setCopiedCellData, copiedCellData } = useSheetStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{ rowId: string; columnId: string } | null>(null);
  
  // Ref for virtual scrolling container
  const internalTableContainerRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = scrollContainerRef || internalTableContainerRef;
  const prevEditingCellRef = useRef(editingCell);
  
  // Initialize column visibility (empty on server to avoid hydration mismatch)
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<Record<string, boolean>>({});
  
  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    if (!externalColumnVisibility || Object.keys(externalColumnVisibility).length === 0) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`column-visibility-${config.id}`);
        if (stored) {
          setInternalColumnVisibility(JSON.parse(stored));
        }
      }
    }
  }, [config.id, externalColumnVisibility]);

  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const setColumnVisibility = onColumnVisibilityChange ?? setInternalColumnVisibility;

  const canEdit = config.permissions?.[userRole]?.canEdit ?? false;

  // Handle cell mouse down - start selection
  const handleCellMouseDown = (e: React.MouseEvent, rowId: string, columnId: string) => {
    // Don't start selection if editing or clicking on select column
    if (editingCell || columnId === 'select') return;
    
    // Don't start selection if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    e.preventDefault();
    
    if (e.shiftKey && selectedCellRange) {
      // Extend selection from existing range
      setSelectedCellRange({
        startRowId: selectedCellRange.startRowId,
        startColumnId: selectedCellRange.startColumnId,
        endRowId: rowId,
        endColumnId: columnId,
      });
    } else {
      // Start new selection
      setDragStartCell({ rowId, columnId });
      setIsDragging(true);
      setSelectedCellRange({
        startRowId: rowId,
        startColumnId: columnId,
        endRowId: rowId,
        endColumnId: columnId,
      });
    }
  };

  // Handle cell mouse enter - extend selection while dragging
  const handleCellMouseEnter = (rowId: string, columnId: string) => {
    if (isDragging && dragStartCell && columnId !== 'select') {
      setSelectedCellRange({
        startRowId: dragStartCell.rowId,
        startColumnId: dragStartCell.columnId,
        endRowId: rowId,
        endColumnId: columnId,
      });
    }
  };

  // Handle mouse up - end selection
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartCell(null);
  };

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-table-container]') && !editingCell) {
        clearCellSelection();
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editingCell, clearCellSelection]);

  // Row height classes
  const rowHeightClasses = {
    compact: 'h-6',
    comfortable: 'h-10',
    spacious: 'h-14',
  };

  const cellPaddingClasses = {
    compact: 'py-0.5',
    comfortable: 'py-2',
    spacious: 'py-3',
  };

  // Reorder columns so pinned ones come first
  const orderedColumns = useMemo(() => {
    const pinnedIds = viewState.pinnedColumns;
    const pinned = config.columns.filter(col => pinnedIds.includes(col.id));
    const unpinned = config.columns.filter(col => !pinnedIds.includes(col.id));
    return [...pinned, ...unpinned];
  }, [config.columns, viewState.pinnedColumns]);

  // Create columns from config
  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    const cols: ColumnDef<RowData>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center px-2 group">
            <Checkbox
              checked={table.getIsAllRowsSelected()}
              onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => {
          const rowIndex = row.index + 1;
          const isHovered = hoveredRow === row.id;
          const isSelected = row.getIsSelected();
          const showCheckbox = isHovered || isSelected;
          const isEmptyRow = row.original._isEmpty === true;
          
          return (
            <div className="flex items-center justify-center px-2 group relative">
              <span className={cn(
                "text-sm text-muted-foreground transition-opacity",
                showCheckbox && !isEmptyRow && "opacity-0"
              )}>
                {!isEmptyRow ? rowIndex : ''}
              </span>
              {!isEmptyRow && (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  showCheckbox ? "opacity-100" : "opacity-0"
                )}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                  />
                </div>
              )}
            </div>
          );
        },
        size: 60,
        minSize: 60,
        maxSize: 60,
        enableSorting: false,
        enableResizing: false,
      },
    ];

    orderedColumns.forEach((colConfig) => {
      const isPinned = viewState.pinnedColumns.includes(colConfig.id);
      
      cols.push({
        id: colConfig.id,
        accessorKey: colConfig.id,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          const hasFilter = !!viewState.columnFilters[colConfig.id];
          const isEditable = canEdit && (colConfig.editable ?? true);

          return (
            <div
              className={cn(
                "flex items-center gap-1 group/header",
                !isEditable && "cursor-not-allowed"
              )}
            >
              <button
                className={cn(
                  'p-0.5 rounded hover:bg-muted transition-all shrink-0',
                  'opacity-0 group-hover/header:opacity-100',
                  isPinned && 'text-primary opacity-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleColumnPin(colConfig.id);
                }}
                title={isPinned ? 'Unpin column' : 'Pin column'}
              >
                {isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </button>
              <span className="font-semibold flex-1 truncate">{colConfig.label}</span>
              {isSorted && (
                <span className="shrink-0">
                  {isSorted === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              )}
              <Popover
                open={openFilterPopover === colConfig.id}
                onOpenChange={(open) => setOpenFilterPopover(open ? colConfig.id : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'p-0.5 rounded hover:bg-muted transition-all shrink-0',
                      'opacity-0 group-hover/header:opacity-100',
                      hasFilter && 'text-primary opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Filter className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0"
                  align="start"
                  side="bottom"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <ColumnFilterDropdown
                    column={colConfig}
                    data={data}
                    currentFilter={viewState.columnFilters[colConfig.id]}
                    onFilterChange={(filter) => {
                      setColumnFilter(colConfig.id, filter);
                      setOpenFilterPopover(null);
                    }}
                    onSort={(direction) => {
                      column.toggleSorting(direction === 'desc');
                      setOpenFilterPopover(null);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        },
        cell: ({ row, column }) => {
          const isEditing =
            editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          const value = row.getValue(column.id);
          
          // Check if this is shipment_no column and if row is existing (numeric ID)
          const rowId = row.original.id;
          const isExistingRow = typeof rowId === 'number' || (typeof rowId === 'string' && !rowId.startsWith('row-') && !rowId.startsWith('empty-'));
          const isShipmentNoColumn = colConfig.id === 'shipment_no' && config.id === 'escalations';
          
          // shipment_no should only be editable for new rows (not existing ones)
          const isEditable = colConfig.editable ?? true;
          const canEditThisCell = isShipmentNoColumn 
            ? (canEdit && isEditable && !isExistingRow)
            : (canEdit && isEditable);

          return (
            <CellRenderer
              value={value}
              columnConfig={colConfig}
              isEditing={isEditing}
              canEdit={canEditThisCell}
              rowHeight={rowHeight}
              rowData={row.original}
              globalSearch={globalSearch}
              onEdit={() => {
                setEditingCell({ rowId: row.id, columnId: column.id });
                clearCellSelection(); // Clear selection when editing starts
              }}
              onSave={(newValue) => {
                onCellUpdate(row.id, column.id, newValue);
                setEditingCell(null);
              }}
              onCancel={() => setEditingCell(null)}
            />
          );
        },
        size: columnWidths[colConfig.id] || colConfig.width || 150,
        minSize: 60,
        maxSize: 800,
        enableSorting: true,
        enableResizing: true,
      });
    });

    return cols;
  }, [orderedColumns, canEdit, editingCell, setEditingCell, onCellUpdate, columnWidths, viewState.columnFilters, viewState.pinnedColumns, setColumnFilter, toggleColumnPin, rowHeight, openFilterPopover, globalSearch]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id, // Use our row ID instead of index
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnSizingChange: (updater) => {
      const currentSizing = columnWidths;
      const newSizing = typeof updater === 'function' 
        ? updater(currentSizing)
        : updater;
      
      // Persist each changed column width
      Object.entries(newSizing).forEach(([columnId, width]) => {
        if (currentSizing[columnId] !== width) {
          setColumnWidth(columnId, width);
        }
      });
    },
    state: {
      sorting,
      columnVisibility,
      columnSizing: columnWidths,
      rowSelection: Array.from(selectedRows).reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {} as Record<string, boolean>),
    },
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' 
        ? updater(table.getState().rowSelection)
        : updater;
      
      // Get all row IDs from data
      const allRowIds = data.map(row => row.id);
      
      // Check each row to see if selection changed
      allRowIds.forEach(rowId => {
        const isNowSelected = newSelection[rowId] === true;
        const wasSelected = selectedRows.has(rowId);
        
        if (isNowSelected !== wasSelected) {
          toggleRowSelection(rowId);
        }
      });
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode,
  });

  // Calculate sticky positions for pinned columns
  const stickyPositions = useMemo(() => {
    const positions: Record<string, number> = {};
    let currentLeft = 60; // Start after select column
    
    viewState.pinnedColumns.forEach(columnId => {
      positions[columnId] = currentLeft;
      const width = columnWidths[columnId] || 150;
      currentLeft += width;
    });
    
    return positions;
  }, [viewState.pinnedColumns, columnWidths]);

  // Get the last pinned column ID for shadow effect
  const lastPinnedColumn = viewState.pinnedColumns.length > 0 
    ? viewState.pinnedColumns[viewState.pinnedColumns.length - 1] 
    : 'select';

  // Virtual scrolling setup
  const { rows } = table.getRowModel();
  
  // Helper function to check if a cell is in the selected range
  const isCellSelected = useCallback((rowId: string, columnId: string): boolean => {
    if (!selectedCellRange || columnId === 'select') return false;
    
    const { startRowId, startColumnId, endRowId, endColumnId } = selectedCellRange;
    
    // Get row indices for comparison
    const rowIds = rows.map(r => r.id);
    const startRowIdx = rowIds.indexOf(startRowId);
    const endRowIdx = rowIds.indexOf(endRowId);
    const currentRowIdx = rowIds.indexOf(rowId);
    
    // Get column indices for comparison
    const columnIds = orderedColumns.map(c => c.id);
    const startColIdx = columnIds.indexOf(startColumnId);
    const endColIdx = columnIds.indexOf(endColumnId);
    const currentColIdx = columnIds.indexOf(columnId);
    
    if (startRowIdx === -1 || endRowIdx === -1 || currentRowIdx === -1) return false;
    if (startColIdx === -1 || endColIdx === -1 || currentColIdx === -1) return false;
    
    const minRow = Math.min(startRowIdx, endRowIdx);
    const maxRow = Math.max(startRowIdx, endRowIdx);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);
    
    return currentRowIdx >= minRow && currentRowIdx <= maxRow &&
           currentColIdx >= minCol && currentColIdx <= maxCol;
  }, [selectedCellRange, rows, orderedColumns]);
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => {
      switch (rowHeight) {
        case 'compact': return 24;
        case 'comfortable': return 40;
        case 'spacious': return 56;
        default: return 24;
      }
    },
    overscan: 10, // Render 10 extra rows outside viewport
  });

  // Scroll to editing cell when it changes (only if not visible)
  useEffect(() => {
    if (editingCell && editingCell !== prevEditingCellRef.current) {
      const rowIndex = rows.findIndex(row => row.id === editingCell.rowId);
      if (rowIndex !== -1) {
        // Check if the row is already visible in the viewport
        const virtualItems = rowVirtualizer.getVirtualItems();
        const isVisible = virtualItems.some(item => item.index === rowIndex);
        
        // Only scroll if the row is not visible, and use 'start' alignment to keep position
        if (!isVisible) {
          rowVirtualizer.scrollToIndex(rowIndex, { align: 'start', behavior: 'smooth' });
        }
      }
    }
    prevEditingCellRef.current = editingCell;
  }, [editingCell, rows, rowVirtualizer]);

  // Save scroll position to localStorage
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      localStorage.setItem(`scroll-position-${config.id}`, JSON.stringify({ scrollTop, scrollLeft }));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [config.id]);

  // Restore scroll position on mount
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const saved = localStorage.getItem(`scroll-position-${config.id}`);
    if (saved) {
      try {
        const { scrollTop, scrollLeft } = JSON.parse(saved);
        // Restore after a short delay to ensure content is rendered
        setTimeout(() => {
          container.scrollTop = scrollTop;
          container.scrollLeft = scrollLeft;
        }, 100);
      } catch (e) {
        console.error('Failed to restore scroll position:', e);
      }
    }
  }, [config.id]);

  // Handle copy (Ctrl+C / Cmd+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      // Don't trigger if typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (modifier && e.key === 'c' && selectedCellRange) {
        e.preventDefault();
        
        const { startRowId, startColumnId, endRowId, endColumnId } = selectedCellRange;
        
        // Get row indices
        const rowIds = rows.map(r => r.id);
        const startRowIdx = rowIds.indexOf(startRowId);
        const endRowIdx = rowIds.indexOf(endRowId);
        const minRow = Math.min(startRowIdx, endRowIdx);
        const maxRow = Math.max(startRowIdx, endRowIdx);
        
        // Get column indices
        const columnIds = orderedColumns.map(c => c.id);
        const startColIdx = columnIds.indexOf(startColumnId);
        const endColIdx = columnIds.indexOf(endColumnId);
        const minCol = Math.min(startColIdx, endColIdx);
        const maxCol = Math.max(startColIdx, endColIdx);
        
        // Extract cell values into 2D array
        const cellData: string[][] = [];
        for (let rowIdx = minRow; rowIdx <= maxRow; rowIdx++) {
          const row = rows[rowIdx];
          if (!row) continue;
          
          const rowData: string[] = [];
          for (let colIdx = minCol; colIdx <= maxCol; colIdx++) {
            const columnId = columnIds[colIdx];
            if (!columnId) continue;
            
            const value = row.getValue(columnId);
            // Format value for clipboard
            let formattedValue = '';
            if (value === null || value === undefined) {
              formattedValue = '';
            } else if (value instanceof Date) {
              formattedValue = value.toISOString();
            } else if (typeof value === 'object') {
              formattedValue = JSON.stringify(value);
            } else {
              formattedValue = String(value);
            }
            rowData.push(formattedValue);
          }
          cellData.push(rowData);
        }
        
        // Store in state for paste
        setCopiedCellData(cellData);
        
        // Format as tab-separated values (Excel compatible)
        const tsvData = cellData.map(row => row.join('\t')).join('\n');
        
        // Copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(tsvData).catch((err) => {
            console.error('Failed to copy to clipboard:', err);
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellRange, rows, orderedColumns, setCopiedCellData]);

  // Handle paste (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      // Don't trigger if typing in inputs (let default behavior work)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (modifier && e.key === 'v') {
        e.preventDefault();
        
        // Determine paste target
        let pasteStartRowId: string;
        let pasteStartColumnId: string;
        
        if (selectedCellRange) {
          // Paste starting at selection start
          pasteStartRowId = selectedCellRange.startRowId;
          pasteStartColumnId = selectedCellRange.startColumnId;
        } else if (editingCell) {
          // Paste at editing cell
          pasteStartRowId = editingCell.rowId;
          pasteStartColumnId = editingCell.columnId;
          // Exit edit mode when pasting
          setEditingCell(null);
        } else {
          // No valid paste target
          return;
        }
        
        // Try to get data from clipboard
        let pasteData: string[][] | null = null;
        
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
              // Parse tab-separated values
              pasteData = clipboardText.split('\n').map(row => row.split('\t'));
            }
          }
        } catch (err) {
          console.error('Failed to read clipboard:', err);
        }
        
        // Fallback to stored copied data
        if (!pasteData) {
          pasteData = copiedCellData;
        }
        
        if (!pasteData || pasteData.length === 0) return;
        
        // Get row and column indices for paste target
        const rowIds = rows.map(r => r.id);
        const columnIds = orderedColumns.map(c => c.id);
        const startRowIdx = rowIds.indexOf(pasteStartRowId);
        const startColIdx = columnIds.indexOf(pasteStartColumnId);
        
        if (startRowIdx === -1 || startColIdx === -1) return;
        
        // Paste data into cells
        const updates: Array<{ rowId: string; columnId: string; value: any }> = [];
        
        for (let rowOffset = 0; rowOffset < pasteData.length; rowOffset++) {
          const rowData = pasteData[rowOffset];
          const targetRowIdx = startRowIdx + rowOffset;
          
          if (targetRowIdx >= rows.length) break;
          const targetRow = rows[targetRowIdx];
          if (!targetRow) break;
          
          for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
            const cellValue = rowData[colOffset];
            const targetColIdx = startColIdx + colOffset;
            
            if (targetColIdx >= columnIds.length) break;
            const targetColumnId = columnIds[targetColIdx];
            if (!targetColumnId || targetColumnId === 'select') continue;
            
            // Check if column is editable
            const colConfig = config.columns.find(c => c.id === targetColumnId);
            if (colConfig && colConfig.editable === false) continue;
            if (!canEdit) continue;
            
            // Parse value based on column type
            let parsedValue: any = cellValue;
            if (colConfig) {
              if (colConfig.type === 'number') {
                parsedValue = cellValue === '' ? null : Number(cellValue);
                if (isNaN(parsedValue)) parsedValue = cellValue; // Keep as string if not a number
              } else if (colConfig.type === 'date' || colConfig.type === 'datetime') {
                parsedValue = cellValue === '' ? null : new Date(cellValue);
                if (isNaN(parsedValue.getTime())) parsedValue = cellValue; // Keep as string if invalid date
              } else if (colConfig.type === 'checkbox') {
                parsedValue = cellValue === 'true' || cellValue === '1' || cellValue.toLowerCase() === 'yes';
              }
            }
            
            updates.push({
              rowId: targetRow.id,
              columnId: targetColumnId,
              value: parsedValue,
            });
          }
        }
        
        // Apply all updates
        updates.forEach(({ rowId, columnId, value }) => {
          onCellUpdate(rowId, columnId, value);
        });
        
        // Clear selection after paste
        clearCellSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, selectedCellRange, rows, orderedColumns, config, canEdit, onCellUpdate, clearCellSelection, copiedCellData]);

  return (
    <div 
      ref={tableContainerRef}
      data-table-container
      className="relative h-full w-full overflow-auto rounded-md border border-border bg-white"
    >
      <table className="border-collapse" style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-30 bg-gray-100 border-b-2 border-gray-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header, index) => {
                const columnId = header.column.id;
                const isPinned = columnId === 'select' || viewState.pinnedColumns.includes(columnId);
                const stickyLeft = columnId === 'select' ? 0 : stickyPositions[columnId];
                const isLastPinned = columnId === lastPinnedColumn;
                
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'relative border-r border-border px-3 text-left text-xs font-medium overflow-hidden',
                      rowHeightClasses[rowHeight],
                      isPinned ? 'sticky z-40 bg-gray-100' : 'bg-gray-100',
                      isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
                    )}
                    style={{ 
                      width: `${header.getSize()}px`, 
                      maxWidth: `${header.getSize()}px`,
                      ...(isPinned ? { 
                        left: `${stickyLeft}px`,
                        backgroundColor: '#f3f4f6' // Gray-100 for pinned headers
                      } : {})
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none',
                          'bg-transparent hover:bg-primary/50 active:bg-primary transition-colors',
                          'after:absolute after:right-0 after:top-0 after:h-full after:w-[8px] after:-translate-x-1/2',
                          header.column.getIsResizing() && 'bg-primary'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        title="Drag to resize column"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rowVirtualizer.getVirtualItems().length > 0 ? (
            <>
              {/* Spacer for rows before viewport */}
              {rowVirtualizer.getVirtualItems()[0].index > 0 && (
                <tr>
                  <td style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                </tr>
              )}
              
              {/* Render only visible rows */}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                const idx = virtualRow.index;
                const isEmptyRow = row.original._isEmpty === true;
                
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onContextMenu={(e) => {
                      // Don't show context menu for empty rows
                      if (!isEmptyRow) {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          rowId: row.id,
                        });
                      }
                    }}
                    className={cn(
                      'border-b border-border group/row',
                      // Base zebra striping - pure white for even, light gray for odd
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      // Hover states with zebra striping maintained
                      !isEmptyRow && !selectedRows.has(row.id) && idx % 2 === 0 && 'hover:bg-gray-100',
                      !isEmptyRow && !selectedRows.has(row.id) && idx % 2 !== 0 && 'hover:bg-gray-100',
                      // Empty row styling
                      isEmptyRow && 'bg-gray-50',
                      // Selected row styling
                      selectedRows.has(row.id) && !isEmptyRow && 'bg-blue-50 hover:bg-blue-100',
                      rowHeightClasses[rowHeight]
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const colConfig = config.columns.find(c => c.id === cell.column.id);
                      const isEditable = colConfig ? canEdit && (colConfig.editable ?? true) : true;
                      const columnId = cell.column.id;
                      const isPinned = columnId === 'select' || viewState.pinnedColumns.includes(columnId);
                      const stickyLeft = columnId === 'select' ? 0 : stickyPositions[columnId];
                      const isLastPinned = columnId === lastPinnedColumn;
                      
                      // Determine background color for pinned cells
                      const getBgColor = () => {
                        if (!isPinned) return undefined;
                        
                        if (selectedRows.has(row.id) && !isEmptyRow) {
                          return '#dbeafe'; // blue-50
                        } else if (isEmptyRow) {
                          return '#f9fafb'; // gray-50
                        } else if (idx % 2 === 0) {
                          return '#ffffff'; // white
                        } else {
                          return '#f9fafb'; // gray-50
                        }
                      };
                      
                      const isSelected = isCellSelected(row.id, columnId);
                      
                      return (
                      <td
                        key={cell.id}
                        className={cn(
                          'border-r border-border p-0 overflow-hidden',
                          rowHeightClasses[rowHeight],
                          !isEditable && 'cursor-not-allowed',
                          isPinned && 'sticky z-20',
                          isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
                          isSelected && 'bg-blue-100 border-2 border-blue-500'
                        )}
                        style={{ 
                          width: `${cell.column.getSize()}px`, 
                          maxWidth: `${cell.column.getSize()}px`,
                          ...(isPinned ? { 
                            left: `${stickyLeft}px`,
                            backgroundColor: isSelected ? '#bfdbfe' : getBgColor() // blue-200 when selected
                          } : {})
                        }}
                        onMouseDown={(e) => handleCellMouseDown(e, row.id, columnId)}
                        onMouseEnter={() => handleCellMouseEnter(row.id, columnId)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                      );
                    })}
                  </tr>
                );
              })}
              
              {/* Spacer for rows after viewport */}
              {rowVirtualizer.getVirtualItems().length > 0 && 
                rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].index < rows.length - 1 && (
                <tr>
                  <td style={{ 
                    height: `${rowVirtualizer.getTotalSize() - 
                      rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` 
                  }} />
                </tr>
              )}
            </>
          ) : null}
        </tbody>
      </table>

      {data.length === 0 && (
        <EmptyState
          type={hasActiveFilters ? 'no-filtered' : 'no-data'}
          onAddRow={onAddRow}
          onClearFilters={onClearFilters}
        />
      )}

      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDuplicate={() => {
            if (onDuplicateRow) {
              onDuplicateRow(contextMenu.rowId);
            }
          }}
          onCopy={() => {
            if (onCopyRow) {
              onCopyRow(contextMenu.rowId);
            }
          }}
          onDelete={() => {
            if (onDeleteRow) {
              onDeleteRow(contextMenu.rowId);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
