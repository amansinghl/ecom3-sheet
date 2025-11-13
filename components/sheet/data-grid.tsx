'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
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
}

export function DataGrid({ config, data, userRole, onCellUpdate, columnVisibility: externalColumnVisibility, onColumnVisibilityChange, onDuplicateRow, onCopyRow, onDeleteRow, onAddRow, onClearFilters, hasActiveFilters }: DataGridProps) {
  const { selectedRows, toggleRowSelection, editingCell, setEditingCell, viewState, rowHeight, columnWidths, setColumnWidth, setColumnFilter, toggleColumnPin } = useSheetStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  
  // Ref for virtual scrolling container
  const tableContainerRef = useRef<HTMLDivElement>(null);
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

          return (
            <CellRenderer
              value={value}
              columnConfig={colConfig}
              isEditing={isEditing}
              canEdit={canEdit && (colConfig.editable ?? true)}
              rowHeight={rowHeight}
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
    // Note: openFilterPopover is intentionally NOT in dependencies as it's UI state for popover visibility
    // Including it would cause columns to regenerate unnecessarily
  }, [orderedColumns, canEdit, editingCell, setEditingCell, onCellUpdate, columnWidths, viewState.columnFilters, viewState.pinnedColumns, setColumnFilter, toggleColumnPin, rowHeight]);

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
    overscan: 10, // Render 10 extra rows outside viewport
  });

  // Scroll to editing cell when it changes
  useEffect(() => {
    if (editingCell && editingCell !== prevEditingCellRef.current) {
      const rowIndex = rows.findIndex(row => row.id === editingCell.rowId);
      if (rowIndex !== -1) {
        rowVirtualizer.scrollToIndex(rowIndex, { align: 'center', behavior: 'smooth' });
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

  return (
    <div 
      ref={tableContainerRef}
      className="relative h-full w-full overflow-auto rounded-md border border-border bg-background"
    >
      <table className="border-collapse" style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-30 bg-muted/50 backdrop-blur">
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
                      isPinned ? 'sticky z-40' : 'bg-muted/50 backdrop-blur',
                      isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
                    )}
                    style={{ 
                      width: `${header.getSize()}px`, 
                      maxWidth: `${header.getSize()}px`,
                      ...(isPinned ? { 
                        left: `${stickyLeft}px`,
                        backgroundColor: 'hsl(var(--muted))'
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
                      // Base zebra striping
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                      // Hover states with zebra striping maintained (using primary color)
                      !isEmptyRow && !selectedRows.has(row.id) && idx % 2 === 0 && 'hover:bg-primary/5',
                      !isEmptyRow && !selectedRows.has(row.id) && idx % 2 !== 0 && 'hover:bg-primary/10',
                      // Empty row styling
                      isEmptyRow && 'bg-muted/10',
                      // Selected row styling
                      selectedRows.has(row.id) && !isEmptyRow && 'bg-primary/10 hover:bg-primary/20',
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
                          return 'hsl(var(--primary) / 0.1)';
                        } else if (isEmptyRow) {
                          return 'hsl(var(--muted) / 0.1)';
                        } else if (idx % 2 === 0) {
                          return 'hsl(var(--background))';
                        } else {
                          return 'hsl(var(--muted) / 0.3)';
                        }
                      };
                      
                      return (
                      <td
                        key={cell.id}
                        className={cn(
                          'border-r border-border p-0 overflow-hidden',
                          rowHeightClasses[rowHeight],
                          !isEditable && 'cursor-not-allowed',
                          isPinned && 'sticky z-20',
                          isLastPinned && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]'
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
