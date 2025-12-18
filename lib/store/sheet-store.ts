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
  loadPinnedColumns
} from '@/lib/utils/storage';

export type RowHeight = 'compact' | 'comfortable' | 'spacious';

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
    // Load persisted state for the new sheet
    get().loadViewStateForSheet(id);
    get().loadColumnWidthsForSheet(id);
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
}));
