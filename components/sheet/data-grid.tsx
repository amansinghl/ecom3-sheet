'use client';

import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
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
import { useSheetStore, CellPosition, SelectionRange } from '@/lib/store/sheet-store';
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
  onUndo?: () => void;
  onRedo?: () => void;
}

export function DataGrid({ config, data, userRole, onCellUpdate, columnVisibility: externalColumnVisibility, onColumnVisibilityChange, onDuplicateRow, onCopyRow, onDeleteRow, onAddRow, onClearFilters, hasActiveFilters, scrollContainerRef, globalSearch = '', onUndo, onRedo }: DataGridProps) {
  const { 
    selectedRows, 
    toggleRowSelection, 
    editingCell, 
    setEditingCell, 
    viewState, 
    rowHeight, 
    columnWidths, 
    setColumnWidth, 
    setColumnFilter, 
    toggleColumnPin,
    // Cell navigation
    focusedCell,
    selectionRange,
    selectedCells,
    setFocusedCell,
    setSelectionRange,
    toggleCellSelection,
    setGridDimensions,
    clearCellSelection,
    moveFocus,
    // Fill drag
    fillDragState,
    startFillDrag,
    updateFillDrag,
    endFillDrag,
  } = useSheetStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);

  // Memoized selection state for fast O(1) lookups - prevents lag
  const selectionState = useMemo(() => {
    // Pre-compute range bounds
    let rangeBounds: { minRow: number; maxRow: number; minCol: number; maxCol: number } | null = null;
    if (selectionRange) {
      rangeBounds = {
        minRow: Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex),
        maxRow: Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex),
        minCol: Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex),
        maxCol: Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex),
      };
    }

    // Pre-compute highlighted columns (using Set for O(1) lookup)
    const highlightedColumns = new Set<number>();
    if (rangeBounds) {
      for (let c = rangeBounds.minCol; c <= rangeBounds.maxCol; c++) {
        highlightedColumns.add(c);
      }
    }
    if (focusedCell) {
      highlightedColumns.add(focusedCell.colIndex);
    }
    // Add columns from Ctrl+selected cells
    selectedCells.forEach(key => {
      const colIdx = parseInt(key.split(',')[1], 10);
      highlightedColumns.add(colIdx);
    });

    return {
      rangeBounds,
      highlightedColumns,
      focusedKey: focusedCell ? `${focusedCell.rowIndex},${focusedCell.colIndex}` : null,
    };
  }, [selectionRange, focusedCell, selectedCells]);

  // Fast cell selection check
  const isCellSelected = useCallback((rowIndex: number, colIndex: number): boolean => {
    const key = `${rowIndex},${colIndex}`;
    // Check Ctrl+selected
    if (selectedCells.has(key)) return true;
    // Check range selection
    const { rangeBounds } = selectionState;
    if (rangeBounds) {
      return rowIndex >= rangeBounds.minRow && rowIndex <= rangeBounds.maxRow &&
             colIndex >= rangeBounds.minCol && colIndex <= rangeBounds.maxCol;
    }
    return false;
  }, [selectedCells, selectionState]);

  // Fast focused cell check
  const isCellFocused = useCallback((rowIndex: number, colIndex: number): boolean => {
    return selectionState.focusedKey === `${rowIndex},${colIndex}`;
  }, [selectionState.focusedKey]);
  
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
              onEdit={() => setEditingCell({ rowId: row.id, columnId: column.id })}
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
    overscan: 100, // Increased for smoother fast scrolling (render 50 extra rows above/below viewport)
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

  // Save scroll position to localStorage (throttled to avoid lag during rapid scroll)
  const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Throttle saves to once per 200ms
      if (scrollSaveTimeoutRef.current) return;
      
      scrollSaveTimeoutRef.current = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        localStorage.setItem(`scroll-position-${config.id}`, JSON.stringify({ scrollTop, scrollLeft }));
        scrollSaveTimeoutRef.current = null;
      }, 200);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
    };
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

  // Update grid dimensions when data or columns change
  useEffect(() => {
    const numCols = orderedColumns.length;
    const numRows = rows.length;
    setGridDimensions({ rows: numRows, cols: numCols });
  }, [orderedColumns.length, rows.length, setGridDimensions]);

  // Track rapid navigation state
  const isRapidNavRef = useRef(false);
  const pendingScrollRef = useRef<{ rowIndex: number; colIndex: number } | null>(null);

  // Fast scroll using virtualizer - optimized for speed
  const scrollToCell = useCallback((rowIndex: number, colIndex: number, immediate: boolean) => {
    if (!tableContainerRef.current) return;
    
    const container = tableContainerRef.current;
    
    // Always use virtualizer for vertical - it's optimized
    rowVirtualizer.scrollToIndex(rowIndex, { 
      align: 'auto',
      behavior: 'auto'
    });

    if (immediate) {
      // For immediate scroll, find cell and use scrollIntoView (fast native method)
      requestAnimationFrame(() => {
        const cellElement = container.querySelector(`td[data-cell="${rowIndex}-${colIndex}"]`);
        if (cellElement) {
          cellElement.scrollIntoView({ 
            block: 'nearest', 
            inline: 'nearest',
            behavior: 'auto' 
          });
        }
      });
    }
  }, [rowVirtualizer]);

  // Scroll effect - minimal during rapid nav, precise otherwise
  useEffect(() => {
    if (!focusedCell) return;
    
    const { rowIndex, colIndex } = focusedCell;

    if (isRapidNavRef.current) {
      // During rapid nav: only use fast virtualizer scroll, skip DOM queries
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto', behavior: 'auto' });
      // Store for precise scroll when rapid nav ends
      pendingScrollRef.current = { rowIndex, colIndex };
    } else {
      // Normal navigation: precise scroll
      scrollToCell(rowIndex, colIndex, true);
    }
  }, [focusedCell, rowVirtualizer, scrollToCell]);

  // Copy selected cells to clipboard
  const handleCopy = useCallback(() => {
    if (!focusedCell && !selectionRange && selectedCells.size === 0) return;
    
    let textToCopy = '';
    
    if (selectionRange) {
      // Copy range of cells (Shift+selection)
      const minRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const maxRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const minCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
      const maxCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);
      
      const rowTexts: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const row = rows[r];
        if (!row) continue;
        
        const cellTexts: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const columnId = orderedColumns[c]?.id;
          if (columnId) {
            const value = row.original[columnId];
            cellTexts.push(value != null ? String(value) : '');
          }
        }
        rowTexts.push(cellTexts.join('\t'));
      }
      textToCopy = rowTexts.join('\n');
    } else if (selectedCells.size > 0) {
      // Copy Ctrl+click selected cells
      // Parse selected cells and organize by row
      const cellsByRow = new Map<number, number[]>();
      selectedCells.forEach(key => {
        const [rowStr, colStr] = key.split(',');
        const rowIdx = parseInt(rowStr, 10);
        const colIdx = parseInt(colStr, 10);
        if (!cellsByRow.has(rowIdx)) {
          cellsByRow.set(rowIdx, []);
        }
        cellsByRow.get(rowIdx)!.push(colIdx);
      });
      
      // Sort rows and columns
      const sortedRows = Array.from(cellsByRow.keys()).sort((a, b) => a - b);
      const rowTexts: string[] = [];
      
      for (const rowIdx of sortedRows) {
        const row = rows[rowIdx];
        if (!row) continue;
        
        const cols = cellsByRow.get(rowIdx)!.sort((a, b) => a - b);
        const cellTexts: string[] = [];
        for (const colIdx of cols) {
          const columnId = orderedColumns[colIdx]?.id;
          if (columnId) {
            const value = row.original[columnId];
            cellTexts.push(value != null ? String(value) : '');
          }
        }
        rowTexts.push(cellTexts.join('\t'));
      }
      textToCopy = rowTexts.join('\n');
    } else if (focusedCell) {
      // Copy single focused cell
      const row = rows[focusedCell.rowIndex];
      const columnId = orderedColumns[focusedCell.colIndex]?.id;
      if (row && columnId) {
        const value = row.original[columnId];
        textToCopy = value != null ? String(value) : '';
      }
    }
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  }, [focusedCell, selectionRange, selectedCells, rows, orderedColumns]);

  // Track when rapid navigation ends
  const rapidNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Finish rapid navigation - do precise scroll to final position
  const finishRapidNav = useCallback(() => {
    isRapidNavRef.current = false;
    
    // Do precise scroll to final position
    if (pendingScrollRef.current) {
      const { rowIndex, colIndex } = pendingScrollRef.current;
      scrollToCell(rowIndex, colIndex, true);
      pendingScrollRef.current = null;
    }
  }, [scrollToCell]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't handle navigation when editing a cell
    if (editingCell) return;
    
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
    const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
    const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));
    
    // Handle undo (Ctrl+Z / Cmd+Z)
    if (isUndo) {
      e.preventDefault();
      onUndo?.();
      return;
    }
    
    // Handle redo (Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z)
    if (isRedo) {
      e.preventDefault();
      onRedo?.();
      return;
    }
    
    // Handle copy (Ctrl+C / Cmd+C)
    if (isCopy) {
      e.preventDefault();
      handleCopy();
      return;
    }
    
    if (isArrowKey) {
      e.preventDefault();
      
      // Track rapid navigation (key being held down)
      if (e.repeat) {
        isRapidNavRef.current = true;
      }
      
      // Reset rapid nav flag after navigation stops
      if (rapidNavTimeoutRef.current) {
        clearTimeout(rapidNavTimeoutRef.current);
      }
      rapidNavTimeoutRef.current = setTimeout(finishRapidNav, 50);
      
      // If no cell is focused yet, focus the first cell
      if (!focusedCell) {
        setFocusedCell({ rowIndex: 0, colIndex: 0 });
        return;
      }
      
      const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
      moveFocus(direction, e.shiftKey);
    }
    
    // Enter key to start editing
    if (e.key === 'Enter' && focusedCell) {
      e.preventDefault();
      const row = rows[focusedCell.rowIndex];
      const columnId = orderedColumns[focusedCell.colIndex]?.id;
      if (row && columnId) {
        setEditingCell({ rowId: row.id, columnId });
      }
    }
    
    // Escape to clear selection
    if (e.key === 'Escape') {
      clearCellSelection();
    }
  }, [editingCell, focusedCell, setFocusedCell, moveFocus, rows, orderedColumns, setEditingCell, clearCellSelection, handleCopy, finishRapidNav, onUndo, onRedo]);

  // Track if we have multi-selected cells (avoid recalculating on every render)
  const hasSelectedCells = selectedCells.size > 0;

  // Handle cell click for focus
  const handleCellClick = useCallback((rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    // Don't interfere with editing mode
    if (editingCell) return;
    
    if (e.shiftKey && focusedCell) {
      // Extend selection from focused cell to clicked cell
      setSelectionRange({
        start: focusedCell,
        end: { rowIndex, colIndex },
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+click - toggle this cell in multi-selection
      toggleCellSelection({ rowIndex, colIndex });
      // Clear range selection when using Ctrl+click
      setSelectionRange(null);
    } else {
      // Single click - just focus this cell, clear other selections
      if (hasSelectedCells) {
        clearCellSelection();
      }
      setFocusedCell({ rowIndex, colIndex });
      setSelectionRange(null);
    }
  }, [editingCell, focusedCell, setFocusedCell, setSelectionRange, toggleCellSelection, hasSelectedCells, clearCellSelection]);

  // Fill drag handlers
  const handleFillDragMove = useCallback((e: MouseEvent) => {
    if (!fillDragState || !tableContainerRef.current) return;
    
    // Find which row the mouse is over
    const container = tableContainerRef.current;
    const rows = container.querySelectorAll('tbody tr[data-index]');
    
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const rowIndex = parseInt(row.getAttribute('data-index') || '0', 10);
        if (rowIndex !== fillDragState.targetEndRow) {
          updateFillDrag(rowIndex);
        }
        break;
      }
    }
  }, [fillDragState, updateFillDrag]);

  const handleFillDragEnd = useCallback(() => {
    if (!fillDragState) return;
    
    const { sourceCell, columnId, targetEndRow } = fillDragState;
    const sourceRow = rows[sourceCell.rowIndex];
    
    if (sourceRow && columnId) {
      const sourceValue = sourceRow.original[columnId];
      
      // Fill cells between source and target (only the specific column)
      const startRow = Math.min(sourceCell.rowIndex, targetEndRow);
      const endRow = Math.max(sourceCell.rowIndex, targetEndRow);
      
      for (let r = startRow; r <= endRow; r++) {
        if (r !== sourceCell.rowIndex) {
          const targetRow = rows[r];
          if (targetRow) {
            onCellUpdate(targetRow.id, columnId, sourceValue);
          }
        }
      }
    }
    
    endFillDrag();
  }, [fillDragState, rows, onCellUpdate, endFillDrag]);

  // Attach/detach fill drag listeners
  useEffect(() => {
    if (fillDragState) {
      document.addEventListener('mousemove', handleFillDragMove);
      document.addEventListener('mouseup', handleFillDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleFillDragMove);
        document.removeEventListener('mouseup', handleFillDragEnd);
      };
    }
  }, [fillDragState, handleFillDragMove, handleFillDragEnd]);

  return (
    <div 
      ref={tableContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative h-full w-full overflow-auto rounded-md border border-border bg-white focus:outline-none scroll-auto select-none"
    >
      <table className="border-collapse" style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-30 bg-gray-100 border-b-2 border-gray-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header, headerIndex) => {
                const columnId = header.column.id;
                const isPinned = columnId === 'select' || viewState.pinnedColumns.includes(columnId);
                const stickyLeft = columnId === 'select' ? 0 : stickyPositions[columnId];
                const isLastPinned = columnId === lastPinnedColumn;
                
                // Check if this column should be highlighted (skip select column)
                const colIndex = columnId === 'select' ? -1 : orderedColumns.findIndex(c => c.id === columnId);
                const isColumnHighlighted = colIndex >= 0 && selectionState.highlightedColumns.has(colIndex);
                
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'relative border-r border-border px-3 text-left text-xs font-medium overflow-hidden',
                      rowHeightClasses[rowHeight],
                      isPinned ? 'sticky z-40' : '',
                      isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
                      // Column highlight styling
                      isColumnHighlighted 
                        ? 'bg-primary/15 border-b-2 border-b-primary' 
                        : 'bg-gray-100'
                    )}
                    style={{ 
                      width: `${header.getSize()}px`, 
                      maxWidth: `${header.getSize()}px`,
                      ...(isPinned ? { 
                        left: `${stickyLeft}px`,
                        backgroundColor: isColumnHighlighted ? 'rgba(99, 102, 241, 0.15)' : '#f3f4f6'
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
        <tbody className="bg-gray-50">
          {rowVirtualizer.getVirtualItems().length > 0 ? (
            <>
              {/* Top spacer - Safari compatible */}
              <tr aria-hidden="true" style={{ height: rowVirtualizer.getVirtualItems()[0]?.start || 0 }}>
                <td colSpan={orderedColumns.length + 1} style={{ padding: 0, border: 'none', backgroundColor: '#f9fafb' }} />
              </tr>
              
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
                      
                      // Calculate column index for cell navigation (skip select column)
                      const colIndex = columnId === 'select' ? -1 : orderedColumns.findIndex(c => c.id === columnId);
                      const rowIndex = virtualRow.index;
                      
                      // Check if this cell is focused or in selection range (using memoized fast lookups)
                      const cellIsFocused = isCellFocused(rowIndex, colIndex);
                      const cellIsSelected = isCellSelected(rowIndex, colIndex);
                      const isDataCell = columnId !== 'select';
                      
                      // Check if cell is in fill drag range (only this specific column)
                      const isInFillRange = fillDragState && 
                        columnId === fillDragState.columnId &&
                        ((fillDragState.targetEndRow >= fillDragState.sourceCell.rowIndex && 
                          rowIndex > fillDragState.sourceCell.rowIndex && 
                          rowIndex <= fillDragState.targetEndRow) ||
                         (fillDragState.targetEndRow < fillDragState.sourceCell.rowIndex && 
                          rowIndex < fillDragState.sourceCell.rowIndex && 
                          rowIndex >= fillDragState.targetEndRow));
                      
                      // Determine background color for pinned cells
                      const getBgColor = () => {
                        if (!isPinned) return undefined;
                        
                        // Cell selection takes precedence
                        if (cellIsSelected && isDataCell) {
                          return 'rgba(99, 102, 241, 0.1)'; // primary/10
                        }
                        
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
                      
                      return (
                      <td
                        key={cell.id}
                        data-cell={isDataCell ? `${rowIndex}-${colIndex}` : undefined}
                        onClick={isDataCell ? (e) => handleCellClick(rowIndex, colIndex, e) : undefined}
                        className={cn(
                          'border-r border-border p-0 overflow-hidden relative',
                          rowHeightClasses[rowHeight],
                          !isEditable && 'cursor-not-allowed',
                          isPinned && 'sticky z-20',
                          isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
                          // Selection styling (Shift+select or Ctrl+click)
                          cellIsSelected && isDataCell && 'cell-selected',
                          // Focus styling - primary border ring
                          cellIsFocused && isDataCell && 'cell-focused-ring',
                          // Fill drag target highlight
                          isInFillRange && isDataCell && 'fill-target'
                        )}
                        style={{ 
                          width: `${cell.column.getSize()}px`, 
                          maxWidth: `${cell.column.getSize()}px`,
                          ...(isPinned ? { 
                            left: `${stickyLeft}px`,
                            backgroundColor: getBgColor()
                          } : {})
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        {/* Fill handle - appears on focused cell */}
                        {cellIsFocused && isDataCell && !editingCell && (
                          <div
                            className="fill-handle"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startFillDrag({ rowIndex, colIndex }, columnId);
                            }}
                          />
                        )}
                      </td>
                      );
                    })}
                  </tr>
                );
              })}
              
              {/* Bottom spacer - Safari compatible */}
              <tr aria-hidden="true" style={{ 
                height: rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0) 
              }}>
                <td colSpan={orderedColumns.length + 1} style={{ padding: 0, border: 'none', backgroundColor: '#f9fafb' }} />
              </tr>
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
