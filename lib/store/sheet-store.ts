import { create } from 'zustand';
import { ViewState, RowData, ColumnFilter } from '@/types';
import { 
  saveFilters, 
  loadFilters, 
  saveRowHeight, 
  loadRowHeight,
  saveColumnWidths,
  loadColumnWidths,
  saveHiddenColumns,
  loadHiddenColumns,
  savePinnedColumns,
  loadPinnedColumns,
  saveColumnOrder,
  loadColumnOrder,
  saveGroupByColumn,
  loadGroupByColumn,
  saveCollapsedGroups,
  loadCollapsedGroups
} from '@/lib/utils/storage';

export type RowHeight = 'compact' | 'comfortable' | 'spacious';

// History entry for undo/redo
export interface HistoryEntry {
  rowId: string;
  columnId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

// Cell position for navigation and selection
export interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

// Selection range for multi-cell selection
export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

interface SheetStore {
  // Current active sheet
  activeSheetId: string;
  setActiveSheetId: (id: string) => void;

  // Row height (persisted per sheet)
  rowHeight: RowHeight;
  setRowHeight: (height: RowHeight) => void;

  // Column widths (persisted per sheet)
  columnWidths: Record<string, number>;
  setColumnWidth: (columnId: string, width: number) => void;
  setColumnWidths: (widths: Record<string, number>) => void;
  loadColumnWidthsForSheet: (sheetId: string) => void;

  // View state (filters, sorts, search)
  viewState: ViewState;
  setColumnFilter: (columnId: string, filter: ColumnFilter | null) => void;
  clearColumnFilter: (columnId: string) => void;
  clearAllFilters: () => void;
  setSorts: (sorts: ViewState['sorts']) => void;
  setSearchQuery: (query: string) => void;
  setHiddenColumns: (columns: string[]) => void;
  setPinnedColumns: (columns: string[]) => void;
  toggleColumnPin: (columnId: string) => void;
  resetViewState: () => void;
  loadViewStateForSheet: (sheetId: string) => void;

  // Column order (for user customization)
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  moveColumn: (columnId: string, direction: 'up' | 'down') => void;
  loadColumnOrderForSheet: (sheetId: string) => void;

  // Selected rows
  selectedRows: Set<string>;
  toggleRowSelection: (rowId: string) => void;
  selectAllRows: (rowIds: string[]) => void;
  clearSelection: () => void;

  // Editing state
  editingCell: { rowId: string; columnId: string } | null;
  setEditingCell: (cell: { rowId: string; columnId: string } | null) => void;

  // Filter panel visibility
  showFilterPanel: boolean;
  setShowFilterPanel: (show: boolean) => void;

  // Cell navigation and selection (Excel-like)
  focusedCell: CellPosition | null;
  selectionRange: SelectionRange | null;
  selectedCells: Set<string>; // For Ctrl+click multi-select (stores "rowIndex,colIndex" keys)
  gridDimensions: { rows: number; cols: number };
  setFocusedCell: (cell: CellPosition | null) => void;
  setSelectionRange: (range: SelectionRange | null) => void;
  toggleCellSelection: (cell: CellPosition) => void; // For Ctrl+click
  setGridDimensions: (dimensions: { rows: number; cols: number }) => void;
  clearCellSelection: () => void;
  moveFocus: (direction: NavigationDirection, extend: boolean) => void;

  // Fill drag state (Excel-like drag to fill)
  fillDragState: { sourceCell: CellPosition; columnId: string; targetEndRow: number } | null;
  startFillDrag: (sourceCell: CellPosition, columnId: string) => void;
  updateFillDrag: (targetEndRow: number) => void;
  endFillDrag: () => void;

  // Undo/Redo history
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushToHistory: (entry: Omit<HistoryEntry, 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // Row grouping
  groupByColumn: string | null;
  collapsedGroups: Set<string>;
  setGroupByColumn: (columnId: string | null) => void;
  toggleGroupCollapse: (groupValue: string) => void;
  collapseAllGroups: (groupValues: string[]) => void;
  expandAllGroups: () => void;
  loadGroupingForSheet: (sheetId: string) => void;
}

const defaultViewState: ViewState = {
  columnFilters: {},
  sorts: [],
  searchQuery: '',
  hiddenColumns: [],
  pinnedColumns: [],
};

export const useSheetStore = create<SheetStore>((set, get) => ({
  activeSheetId: 'escalations',
  setActiveSheetId: (id) => {
    set({ activeSheetId: id });
    get().loadViewStateForSheet(id);
    get().loadColumnWidthsForSheet(id);
    get().loadColumnOrderForSheet(id);
    get().loadGroupingForSheet(id);
    const savedRowHeight = loadRowHeight(id);
    if (savedRowHeight) {
      set({ rowHeight: savedRowHeight });
    }
  },

  rowHeight: 'compact',
  setRowHeight: (height) => {
    set({ rowHeight: height });
    const { activeSheetId } = get();
    saveRowHeight(activeSheetId, height);
  },

  columnWidths: {},
  setColumnWidth: (columnId, width) => {
    set((state) => ({
      columnWidths: { ...state.columnWidths, [columnId]: width },
    }));
    const { activeSheetId, columnWidths } = get();
    saveColumnWidths(activeSheetId, { ...columnWidths, [columnId]: width });
  },
  setColumnWidths: (widths) => {
    set({ columnWidths: widths });
    const { activeSheetId } = get();
    saveColumnWidths(activeSheetId, widths);
  },
  loadColumnWidthsForSheet: (sheetId) => {
    const widths = loadColumnWidths(sheetId);
    set({ columnWidths: widths });
  },

  viewState: defaultViewState,
  setColumnFilter: (columnId, filter) => {
    set((state) => {
      const newFilters = { ...state.viewState.columnFilters };
      if (filter === null) {
        delete newFilters[columnId];
      } else {
        newFilters[columnId] = filter;
      }
      const { activeSheetId } = get();
      saveFilters(activeSheetId, newFilters);
      return {
        viewState: {
          ...state.viewState,
          columnFilters: newFilters,
        },
      };
    });
  },
  clearColumnFilter: (columnId) => {
    set((state) => {
      const newFilters = { ...state.viewState.columnFilters };
      delete newFilters[columnId];
      const { activeSheetId } = get();
      saveFilters(activeSheetId, newFilters);
      return {
        viewState: {
          ...state.viewState,
          columnFilters: newFilters,
        },
      };
    });
  },
  clearAllFilters: () => {
    set((state) => ({
      viewState: { ...state.viewState, columnFilters: {} },
    }));
    const { activeSheetId } = get();
    saveFilters(activeSheetId, {});
  },
  setSorts: (sorts) =>
    set((state) => ({
      viewState: { ...state.viewState, sorts },
    })),
  setSearchQuery: (query) =>
    set((state) => ({
      viewState: { ...state.viewState, searchQuery: query },
    })),
  setHiddenColumns: (columns) => {
    set((state) => ({
      viewState: { ...state.viewState, hiddenColumns: columns },
    }));
    const { activeSheetId } = get();
    saveHiddenColumns(activeSheetId, columns);
  },
  setPinnedColumns: (columns) => {
    set((state) => ({
      viewState: { ...state.viewState, pinnedColumns: columns },
    }));
    const { activeSheetId } = get();
    savePinnedColumns(activeSheetId, columns);
  },
  toggleColumnPin: (columnId) => {
    set((state) => {
      const { pinnedColumns } = state.viewState;
      const newPinnedColumns = pinnedColumns.includes(columnId)
        ? pinnedColumns.filter((id) => id !== columnId)
        : [...pinnedColumns, columnId];
      
      const { activeSheetId } = get();
      savePinnedColumns(activeSheetId, newPinnedColumns);
      
      return {
        viewState: { ...state.viewState, pinnedColumns: newPinnedColumns },
      };
    });
  },
  resetViewState: () => {
    set({ viewState: defaultViewState });
    const { activeSheetId } = get();
    saveFilters(activeSheetId, {});
    saveHiddenColumns(activeSheetId, []);
    savePinnedColumns(activeSheetId, []);
  },
  loadViewStateForSheet: (sheetId) => {
    const columnFilters = loadFilters(sheetId);
    const hiddenColumns = loadHiddenColumns(sheetId);
    const pinnedColumns = loadPinnedColumns(sheetId);
    set((state) => ({
      viewState: {
        ...state.viewState,
        columnFilters,
        hiddenColumns,
        pinnedColumns,
      },
    }));
  },

  // Column order (for user customization)
  columnOrder: [],
  setColumnOrder: (order) => {
    set({ columnOrder: order });
    const { activeSheetId } = get();
    saveColumnOrder(activeSheetId, order);
  },
  moveColumn: (columnId, direction) => {
    const { columnOrder } = get();
    const currentIndex = columnOrder.indexOf(columnId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(columnOrder.length - 1, currentIndex + 1);
    
    if (newIndex === currentIndex) return;
    
    const newOrder = [...columnOrder];
    newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, columnId);
    
    set({ columnOrder: newOrder });
    const { activeSheetId } = get();
    saveColumnOrder(activeSheetId, newOrder);
  },
  loadColumnOrderForSheet: (sheetId) => {
    const order = loadColumnOrder(sheetId);
    set({ columnOrder: order });
  },

  selectedRows: new Set(),
  toggleRowSelection: (rowId) =>
    set((state) => {
      const newSelection = new Set(state.selectedRows);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
      } else {
        newSelection.add(rowId);
      }
      return { selectedRows: newSelection };
    }),
  selectAllRows: (rowIds) =>
    set({ selectedRows: new Set(rowIds) }),
  clearSelection: () => set({ selectedRows: new Set() }),

  editingCell: null,
  setEditingCell: (cell) => set({ editingCell: cell }),

  showFilterPanel: false,
  setShowFilterPanel: (show) => set({ showFilterPanel: show }),

  // Cell navigation and selection (Excel-like)
  focusedCell: null,
  selectionRange: null,
  selectedCells: new Set(),
  gridDimensions: { rows: 0, cols: 0 },
  
  setFocusedCell: (cell) => set({ focusedCell: cell }),
  
  setSelectionRange: (range) => set({ selectionRange: range }),
  
  toggleCellSelection: (cell) => set((state) => {
    const key = `${cell.rowIndex},${cell.colIndex}`;
    const newSelection = new Set(state.selectedCells);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    return { selectedCells: newSelection, focusedCell: cell };
  }),
  
  setGridDimensions: (dimensions) => set({ gridDimensions: dimensions }),
  
  clearCellSelection: () => set({ 
    focusedCell: null, 
    selectionRange: null,
    selectedCells: new Set(),
  }),
  
  moveFocus: (direction, extend) => {
    const { focusedCell, selectionRange, gridDimensions } = get();
    
    if (!focusedCell) return;
    
    const { rowIndex, colIndex } = focusedCell;
    const { rows, cols } = gridDimensions;
    
    let newRowIndex = rowIndex;
    let newColIndex = colIndex;
    
    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(rows - 1, rowIndex + 1);
        break;
      case 'left':
        newColIndex = Math.max(0, colIndex - 1);
        break;
      case 'right':
        newColIndex = Math.min(cols - 1, colIndex + 1);
        break;
    }
    
    const newFocusedCell = { rowIndex: newRowIndex, colIndex: newColIndex };
    
    if (extend) {
      // Extend selection from the anchor point (start of selection or original focused cell)
      const anchor = selectionRange?.start || focusedCell;
      set({
        focusedCell: newFocusedCell,
        selectionRange: {
          start: anchor,
          end: newFocusedCell,
        },
      });
    } else {
      // Move focus without selection
      set({
        focusedCell: newFocusedCell,
        selectionRange: null,
      });
    }
  },

  // Fill drag state (Excel-like drag to fill)
  fillDragState: null,
  
  startFillDrag: (sourceCell, columnId) => set({
    fillDragState: { 
      sourceCell, 
      columnId,
      targetEndRow: sourceCell.rowIndex 
    }
  }),
  
  updateFillDrag: (targetEndRow) => set((state) => {
    if (!state.fillDragState) return state;
    return {
      fillDragState: { ...state.fillDragState, targetEndRow }
    };
  }),
  
  endFillDrag: () => set({ fillDragState: null }),

  // Undo/Redo history (max 50 entries)
  undoStack: [],
  redoStack: [],
  
  pushToHistory: (entry) => set((state) => {
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    // Limit stack size to 50 entries
    const newUndoStack = [...state.undoStack, newEntry].slice(-50);
    return {
      undoStack: newUndoStack,
      redoStack: [], // Clear redo stack when new action is performed
    };
  }),
  
  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    
    const entry = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, entry].slice(-50),
    });
    return entry;
  },
  
  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    
    const entry = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, entry].slice(-50),
    });
    return entry;
  },
  
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  
  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  // Row grouping
  groupByColumn: null,
  collapsedGroups: new Set(),

  setGroupByColumn: (columnId) => {
    set({ groupByColumn: columnId, collapsedGroups: new Set() });
    const { activeSheetId } = get();
    saveGroupByColumn(activeSheetId, columnId);
    saveCollapsedGroups(activeSheetId, []);
  },

  toggleGroupCollapse: (groupValue) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedGroups);
      if (newCollapsed.has(groupValue)) {
        newCollapsed.delete(groupValue);
      } else {
        newCollapsed.add(groupValue);
      }
      const { activeSheetId } = get();
      saveCollapsedGroups(activeSheetId, Array.from(newCollapsed));
      return { collapsedGroups: newCollapsed };
    });
  },

  collapseAllGroups: (groupValues) => {
    const newCollapsed = new Set(groupValues);
    set({ collapsedGroups: newCollapsed });
    const { activeSheetId } = get();
    saveCollapsedGroups(activeSheetId, groupValues);
  },

  expandAllGroups: () => {
    set({ collapsedGroups: new Set() });
    const { activeSheetId } = get();
    saveCollapsedGroups(activeSheetId, []);
  },

  loadGroupingForSheet: (sheetId) => {
    const groupByColumn = loadGroupByColumn(sheetId);
    const collapsedGroups = loadCollapsedGroups(sheetId);
    set({ 
      groupByColumn, 
      collapsedGroups: new Set(collapsedGroups) 
    });
  },
}));
