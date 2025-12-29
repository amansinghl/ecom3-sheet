import { create } from 'zustand';
import { ViewState, RowData, ColumnFilter, UserView, ViewConfig, Filter, Sort } from '@/types';
import { 
  saveRowHeight, 
  loadRowHeight,
  saveColumnWidths,
  loadColumnWidths,
  // Views storage
  saveViews,
  loadViews,
  saveActiveView,
  loadActiveView,
  saveDefaultView,
  loadDefaultView,
  // Per-view state storage
  saveViewFilters,
  loadViewFilters,
  saveViewHiddenColumns,
  loadViewHiddenColumns,
  saveViewPinnedColumns,
  loadViewPinnedColumns,
  saveViewColumnOrder,
  loadViewColumnOrder,
  saveViewSorts,
  loadViewSorts,
  saveViewGroupBy,
  loadViewGroupBy,
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

  // Sync current state to active view
  syncStateToActiveView: () => void;

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
  editingCell: { rowId: string; columnId: string; initialValue?: string } | null;
  setEditingCell: (cell: { rowId: string; columnId: string; initialValue?: string } | null) => void;

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
  moveToExtreme: (direction: NavigationDirection, extend: boolean) => void;

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

  // Views management
  views: UserView[];
  activeViewId: string | null;
  defaultViewId: string | null;
  setViews: (views: UserView[]) => void;
  addView: (view: Omit<UserView, 'id' | 'createdAt' | 'updatedAt'>) => UserView;
  updateView: (viewId: string, updates: Partial<UserView>) => void;
  deleteView: (viewId: string) => void;
  duplicateView: (viewId: string) => UserView | null;
  setActiveViewId: (viewId: string | null) => void;
  setDefaultViewId: (viewId: string | null) => void;
  loadViewsForSheet: (sheetId: string, systemViews?: ViewConfig[], userName?: string) => void;
  saveCurrentStateAsView: (name: string, description?: string) => UserView;
  applyView: (view: UserView) => void;
  getCurrentViewState: () => Omit<UserView, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'isSystem'>;
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
      return {
        viewState: {
          ...state.viewState,
          columnFilters: newFilters,
        },
      };
    });
    get().syncStateToActiveView();
  },
  clearColumnFilter: (columnId) => {
    set((state) => {
      const newFilters = { ...state.viewState.columnFilters };
      delete newFilters[columnId];
      return {
        viewState: {
          ...state.viewState,
          columnFilters: newFilters,
        },
      };
    });
    get().syncStateToActiveView();
  },
  clearAllFilters: () => {
    set((state) => ({
      viewState: { ...state.viewState, columnFilters: {} },
    }));
    get().syncStateToActiveView();
  },
  setSorts: (sorts) => {
    set((state) => ({
      viewState: { ...state.viewState, sorts },
    }));
    get().syncStateToActiveView();
  },
  setSearchQuery: (query) =>
    set((state) => ({
      viewState: { ...state.viewState, searchQuery: query },
    })),
  setHiddenColumns: (columns) => {
    set((state) => ({
      viewState: { ...state.viewState, hiddenColumns: columns },
    }));
    get().syncStateToActiveView();
  },
  setPinnedColumns: (columns) => {
    set((state) => ({
      viewState: { ...state.viewState, pinnedColumns: columns },
    }));
    get().syncStateToActiveView();
  },
  toggleColumnPin: (columnId) => {
    set((state) => {
      const { pinnedColumns } = state.viewState;
      const newPinnedColumns = pinnedColumns.includes(columnId)
        ? pinnedColumns.filter((id) => id !== columnId)
        : [...pinnedColumns, columnId];
      
      return {
        viewState: { ...state.viewState, pinnedColumns: newPinnedColumns },
      };
    });
    get().syncStateToActiveView();
  },
  resetViewState: () => {
    set({ viewState: defaultViewState });
    get().syncStateToActiveView();
  },
  loadViewStateForSheet: (_sheetId) => {
    set((state) => ({
      viewState: {
        ...defaultViewState,
        searchQuery: state.viewState.searchQuery,
      },
    }));
  },

  syncStateToActiveView: () => {
    const { activeViewId, views, activeSheetId, viewState, columnOrder, groupByColumn } = get();
    
    if (!activeViewId) return;
    
    const activeView = views.find((v) => v.id === activeViewId);
    if (!activeView) return;
    
    saveViewFilters(activeSheetId, activeViewId, viewState.columnFilters);
    saveViewHiddenColumns(activeSheetId, activeViewId, viewState.hiddenColumns);
    saveViewPinnedColumns(activeSheetId, activeViewId, viewState.pinnedColumns);
    saveViewColumnOrder(activeSheetId, activeViewId, columnOrder);
    saveViewSorts(activeSheetId, activeViewId, viewState.sorts);
    saveViewGroupBy(activeSheetId, activeViewId, groupByColumn);
    
    if (!activeView.isSystem) {
      const filters: Filter[] = Object.entries(viewState.columnFilters)
        .filter(([_, filter]) => filter.condition)
        .map(([columnId, filter]) => ({
          columnId,
          operator: filter.condition!.operator,
          value: filter.condition!.value,
        }));
      
      const updatedView: UserView = {
        ...activeView,
        filters,
        hiddenColumns: viewState.hiddenColumns,
        pinnedColumns: viewState.pinnedColumns,
        columnOrder,
        sorts: viewState.sorts,
        groupByColumn,
        updatedAt: new Date().toISOString(),
      };
      
      set((state) => ({
        views: state.views.map((view) =>
          view.id === activeViewId ? updatedView : view
        ),
      }));
      
      saveViews(activeSheetId, get().views);
    }
  },

  columnOrder: [],
  setColumnOrder: (order) => {
    set({ columnOrder: order });
    get().syncStateToActiveView();
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
    get().syncStateToActiveView();
  },
  loadColumnOrderForSheet: (_sheetId) => {
    set({ columnOrder: [] });
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

  // CTRL+Arrow: Jump to extreme cell in direction (like Google Sheets)
  moveToExtreme: (direction, extend) => {
    const { focusedCell, selectionRange, gridDimensions } = get();
    
    if (!focusedCell) return;
    
    const { colIndex } = focusedCell;
    const { rows, cols } = gridDimensions;
    
    let newRowIndex = focusedCell.rowIndex;
    let newColIndex = colIndex;
    
    switch (direction) {
      case 'up':
        newRowIndex = 0; // Jump to first row
        break;
      case 'down':
        newRowIndex = rows - 1; // Jump to last row
        break;
      case 'left':
        newColIndex = 0; // Jump to first column
        break;
      case 'right':
        newColIndex = cols - 1; // Jump to last column
        break;
    }
    
    const newFocusedCell = { rowIndex: newRowIndex, colIndex: newColIndex };
    
    if (extend) {
      // Extend selection from the anchor point (CTRL+SHIFT+Arrow)
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

  groupByColumn: null,
  collapsedGroups: new Set(),

  setGroupByColumn: (columnId) => {
    set({ groupByColumn: columnId, collapsedGroups: new Set() });
    get().syncStateToActiveView();
  },

  toggleGroupCollapse: (groupValue) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedGroups);
      if (newCollapsed.has(groupValue)) {
        newCollapsed.delete(groupValue);
      } else {
        newCollapsed.add(groupValue);
      }
      return { collapsedGroups: newCollapsed };
    });
  },

  collapseAllGroups: (groupValues) => {
    set({ collapsedGroups: new Set(groupValues) });
  },

  expandAllGroups: () => {
    set({ collapsedGroups: new Set() });
  },

  loadGroupingForSheet: (_sheetId) => {
    set({ groupByColumn: null, collapsedGroups: new Set() });
  },

  // Views management
  views: [],
  activeViewId: null,
  defaultViewId: null,

  setViews: (views) => {
    set({ views });
    const { activeSheetId } = get();
    saveViews(activeSheetId, views);
  },

  addView: (viewData) => {
    const now = new Date().toISOString();
    const newView: UserView = {
      ...viewData,
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    
    set((state) => ({
      views: [...state.views, newView],
    }));
    
    const { activeSheetId, views } = get();
    saveViews(activeSheetId, views);
    
    return newView;
  },

  updateView: (viewId, updates) => {
    set((state) => ({
      views: state.views.map((view) =>
        view.id === viewId
          ? { ...view, ...updates, updatedAt: new Date().toISOString() }
          : view
      ),
    }));
    
    const { activeSheetId, views } = get();
    saveViews(activeSheetId, views);
  },

  deleteView: (viewId) => {
    const { views, activeViewId, defaultViewId } = get();
    const viewToDelete = views.find(v => v.id === viewId);
    
    // Don't delete system views
    if (viewToDelete?.isSystem) {
      console.warn('Cannot delete system views');
      return;
    }
    
    set((state) => ({
      views: state.views.filter((view) => view.id !== viewId),
      // Clear active view if it was deleted
      activeViewId: state.activeViewId === viewId ? null : state.activeViewId,
      // Clear default view if it was deleted
      defaultViewId: state.defaultViewId === viewId ? null : state.defaultViewId,
    }));
    
    const { activeSheetId } = get();
    saveViews(activeSheetId, get().views);
    
    if (activeViewId === viewId) {
      saveActiveView(activeSheetId, null);
    }
    if (defaultViewId === viewId) {
      saveDefaultView(activeSheetId, null);
    }
  },

  duplicateView: (viewId) => {
    const { views } = get();
    const viewToDuplicate = views.find((v) => v.id === viewId);
    
    if (!viewToDuplicate) return null;
    
    const now = new Date().toISOString();
    const newView: UserView = {
      ...viewToDuplicate,
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${viewToDuplicate.name} (Copy)`,
      isSystem: false, // Duplicated views are never system views
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
    
    set((state) => ({
      views: [...state.views, newView],
    }));
    
    const { activeSheetId } = get();
    saveViews(activeSheetId, get().views);
    
    return newView;
  },

  setActiveViewId: (viewId) => {
    set({ activeViewId: viewId });
    const { activeSheetId } = get();
    saveActiveView(activeSheetId, viewId);
  },

  setDefaultViewId: (viewId) => {
    set((state) => ({
      defaultViewId: viewId,
      views: state.views.map((view) => ({
        ...view,
        isDefault: view.id === viewId,
      })),
    }));
    
    const { activeSheetId, views } = get();
    saveDefaultView(activeSheetId, viewId);
    saveViews(activeSheetId, views);
  },

  loadViewsForSheet: (sheetId, systemViews = [], userName) => {
    let userViews = loadViews(sheetId);
    const activeViewId = loadActiveView(sheetId);
    const defaultViewId = loadDefaultView(sheetId);
    
    const now = new Date().toISOString();
    const systemUserViews: UserView[] = systemViews.map((sv) => ({
      id: sv.id,
      name: sv.name,
      description: sv.description,
      filters: sv.filters,
      isDefault: sv.isDefault,
      isSystem: true,
      icon: sv.id === 'open' ? 'Inbox' : 'Archive',
      color: sv.id === 'open' ? '#22c55e' : '#6b7280',
      hiddenColumns: [],
      pinnedColumns: [],
      columnOrder: [],
      sorts: [],
      groupByColumn: null,
      createdAt: now,
      updatedAt: now,
    }));
    
    if (userViews.length === 0 && userName) {
      const defaultPersonalView: UserView = {
        id: `view-personal-${Date.now()}`,
        name: `${userName}'s View`,
        description: 'Your personal default view',
        filters: [],
        isDefault: false,
        isSystem: false,
        icon: 'User',
        color: '#8b5cf6',
        hiddenColumns: [],
        pinnedColumns: [],
        columnOrder: [],
        sorts: [],
        groupByColumn: null,
        createdAt: now,
        updatedAt: now,
      };
      userViews = [defaultPersonalView];
      saveViews(sheetId, userViews);
    }
    
    const allViews = [...systemUserViews, ...userViews];
    
    let effectiveActiveViewId = activeViewId;
    if (!effectiveActiveViewId || !allViews.find(v => v.id === effectiveActiveViewId)) {
      if (defaultViewId && allViews.find(v => v.id === defaultViewId)) {
        effectiveActiveViewId = defaultViewId;
      } else {
        const defaultView = allViews.find(v => v.isDefault) || allViews[0];
        effectiveActiveViewId = defaultView?.id || null;
      }
    }
    
    set({
      views: allViews,
      activeViewId: effectiveActiveViewId,
      defaultViewId: defaultViewId,
    });
    
    const viewToApply = allViews.find((v) => v.id === effectiveActiveViewId);
    if (viewToApply) {
      const savedFilters = loadViewFilters(sheetId, viewToApply.id);
      const savedHiddenColumns = loadViewHiddenColumns(sheetId, viewToApply.id);
      const savedPinnedColumns = loadViewPinnedColumns(sheetId, viewToApply.id);
      const savedColumnOrder = loadViewColumnOrder(sheetId, viewToApply.id);
      const savedSorts = loadViewSorts(sheetId, viewToApply.id);
      const savedGroupBy = loadViewGroupBy(sheetId, viewToApply.id);
      
      let columnFilters: Record<string, ColumnFilter>;
      
      if (Object.keys(savedFilters).length > 0) {
        columnFilters = savedFilters;
      } else {
        columnFilters = {};
        viewToApply.filters.forEach((filter) => {
          columnFilters[filter.columnId] = {
            type: 'condition',
            condition: {
              operator: filter.operator,
              value: filter.value,
            },
          };
        });
      }
      
      const hiddenColumns = savedHiddenColumns.length > 0 ? savedHiddenColumns : viewToApply.hiddenColumns;
      const pinnedColumns = savedPinnedColumns.length > 0 ? savedPinnedColumns : viewToApply.pinnedColumns;
      const columnOrder = savedColumnOrder.length > 0 ? savedColumnOrder : viewToApply.columnOrder;
      const sorts = savedSorts.length > 0 ? savedSorts : viewToApply.sorts;
      const groupByColumn = savedGroupBy !== null ? savedGroupBy : viewToApply.groupByColumn;
      
      set((state) => ({
        viewState: {
          ...state.viewState,
          columnFilters,
          hiddenColumns,
          pinnedColumns,
          sorts,
        },
        columnOrder: columnOrder.length > 0 ? columnOrder : state.columnOrder,
        groupByColumn,
      }));
    }
  },

  saveCurrentStateAsView: (name, description) => {
    const currentState = get().getCurrentViewState();
    
    const newView = get().addView({
      name,
      description,
      isSystem: false,
      isDefault: false,
      ...currentState,
    });
    
    return newView;
  },

  applyView: (view) => {
    const { activeSheetId } = get();
    
    const savedFilters = loadViewFilters(activeSheetId, view.id);
    const savedHiddenColumns = loadViewHiddenColumns(activeSheetId, view.id);
    const savedPinnedColumns = loadViewPinnedColumns(activeSheetId, view.id);
    const savedColumnOrder = loadViewColumnOrder(activeSheetId, view.id);
    const savedSorts = loadViewSorts(activeSheetId, view.id);
    const savedGroupBy = loadViewGroupBy(activeSheetId, view.id);
    
    let columnFilters: Record<string, ColumnFilter>;
    
    if (Object.keys(savedFilters).length > 0) {
      columnFilters = savedFilters;
    } else {
      columnFilters = {};
      view.filters.forEach((filter) => {
        columnFilters[filter.columnId] = {
          type: 'condition',
          condition: {
            operator: filter.operator,
            value: filter.value,
          },
        };
      });
    }
    
    const hiddenColumns = savedHiddenColumns.length > 0 ? savedHiddenColumns : view.hiddenColumns;
    const pinnedColumns = savedPinnedColumns.length > 0 ? savedPinnedColumns : view.pinnedColumns;
    const columnOrder = savedColumnOrder.length > 0 ? savedColumnOrder : view.columnOrder;
    const sorts = savedSorts.length > 0 ? savedSorts : view.sorts;
    const groupByColumn = savedGroupBy !== null ? savedGroupBy : view.groupByColumn;
    
    set((state) => ({
      viewState: {
        ...state.viewState,
        columnFilters,
        hiddenColumns,
        pinnedColumns,
        sorts,
      },
      columnOrder: columnOrder.length > 0 ? columnOrder : state.columnOrder,
      groupByColumn,
      activeViewId: view.id,
      collapsedGroups: new Set(),
    }));
    
    saveActiveView(activeSheetId, view.id);
  },

  getCurrentViewState: () => {
    const { viewState, columnOrder, groupByColumn } = get();
    
    const filters: Filter[] = Object.entries(viewState.columnFilters)
      .filter(([_, filter]) => filter.condition)
      .map(([columnId, filter]) => ({
        columnId,
        operator: filter.condition!.operator,
        value: filter.condition!.value,
      }));
    
    return {
      filters,
      hiddenColumns: viewState.hiddenColumns,
      pinnedColumns: viewState.pinnedColumns,
      columnOrder,
      sorts: viewState.sorts,
      groupByColumn,
    };
  },
}));
