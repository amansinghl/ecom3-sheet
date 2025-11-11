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
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

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
  const { selectedRows, toggleRowSelection, editingCell, setEditingCell, viewState, rowHeight, columnWidths, setColumnWidth, setColumnFilter } = useSheetStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
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

    config.columns.forEach((colConfig) => {
      cols.push({
        id: colConfig.id,
        accessorKey: colConfig.id,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          const hasFilter = !!viewState.columnFilters[colConfig.id];
          const isHovered = hoveredColumn === colConfig.id;
          const showFilterIcon = hasFilter || isHovered;

          return (
            <div
              className="flex items-center gap-1 group"
              onMouseEnter={() => setHoveredColumn(colConfig.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <span className="font-semibold flex-1">{colConfig.label}</span>
              {isSorted && (
                <span>
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
                      'p-0.5 rounded hover:bg-muted transition-opacity',
                      showFilterIcon ? 'opacity-100' : 'opacity-0',
                      hasFilter && 'text-primary'
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
  }, [config, canEdit, editingCell, setEditingCell, onCellUpdate, hoveredRow, columnWidths, hoveredColumn, openFilterPopover, viewState.columnFilters, data, setColumnFilter]);

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

  return (
    <div 
      ref={tableContainerRef}
      className="relative h-full w-full overflow-auto rounded-md border border-border bg-background"
    >
      <table className="border-collapse" style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'relative border-r border-border px-3 text-left text-xs font-medium overflow-hidden',
                    rowHeightClasses[rowHeight]
                  )}
                  style={{ width: `${header.getSize()}px`, maxWidth: `${header.getSize()}px` }}
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
              ))}
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
                      'border-b border-border transition-colors',
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
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn('border-r border-border p-0 overflow-hidden', rowHeightClasses[rowHeight])}
                        style={{ width: `${cell.column.getSize()}px`, maxWidth: `${cell.column.getSize()}px` }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
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
