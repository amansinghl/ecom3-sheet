/**
 * Utility functions for managing persistent state in localStorage
 */

import { ColumnFilter, UserView, Sort } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';

// Storage keys
const STORAGE_KEYS = {
  filters: (sheetId: string) => `sheet-filters-${sheetId}`,
  columnWidths: (sheetId: string) => `sheet-column-widths-${sheetId}`,
  rowHeight: (sheetId: string) => `sheet-row-height-${sheetId}`,
  columnVisibility: (sheetId: string) => `column-visibility-${sheetId}`,
  hiddenColumns: (sheetId: string) => `sheet-hidden-columns-${sheetId}`,
  pinnedColumns: (sheetId: string) => `sheet-pinned-columns-${sheetId}`,
  columnOrder: (sheetId: string) => `sheet-column-order-${sheetId}`,
  groupByColumn: (sheetId: string) => `sheet-group-by-${sheetId}`,
  collapsedGroups: (sheetId: string) => `sheet-collapsed-groups-${sheetId}`,
  // Views storage
  views: (sheetId: string) => `sheet-views-${sheetId}`,
  activeView: (sheetId: string) => `sheet-active-view-${sheetId}`,
  defaultView: (sheetId: string) => `sheet-default-view-${sheetId}`,
  // Per-view state storage (for system views that can't be modified)
  viewFilters: (sheetId: string, viewId: string) => `sheet-view-filters-${sheetId}-${viewId}`,
  viewHiddenColumns: (sheetId: string, viewId: string) => `sheet-view-hidden-${sheetId}-${viewId}`,
  viewPinnedColumns: (sheetId: string, viewId: string) => `sheet-view-pinned-${sheetId}-${viewId}`,
  viewColumnOrder: (sheetId: string, viewId: string) => `sheet-view-order-${sheetId}-${viewId}`,
  viewSorts: (sheetId: string, viewId: string) => `sheet-view-sorts-${sheetId}-${viewId}`,
  viewGroupBy: (sheetId: string, viewId: string) => `sheet-view-groupby-${sheetId}-${viewId}`,
};

/**
 * Save filters to localStorage
 */
export function saveFilters(sheetId: string, filters: Record<string, ColumnFilter>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.filters(sheetId), JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save filters to localStorage:', error);
  }
}

/**
 * Load filters from localStorage
 */
export function loadFilters(sheetId: string): Record<string, ColumnFilter> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.filters(sheetId));
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load filters from localStorage:', error);
    return {};
  }
}

/**
 * Save column widths to localStorage
 */
export function saveColumnWidths(sheetId: string, widths: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.columnWidths(sheetId), JSON.stringify(widths));
  } catch (error) {
    console.error('Failed to save column widths to localStorage:', error);
  }
}

/**
 * Load column widths from localStorage
 */
export function loadColumnWidths(sheetId: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.columnWidths(sheetId));
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load column widths from localStorage:', error);
    return {};
  }
}

/**
 * Save row height to localStorage
 */
export function saveRowHeight(sheetId: string, height: RowHeight): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.rowHeight(sheetId), height);
  } catch (error) {
    console.error('Failed to save row height to localStorage:', error);
  }
}

/**
 * Load row height from localStorage
 */
export function loadRowHeight(sheetId: string): RowHeight | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.rowHeight(sheetId));
    if (stored && ['compact', 'comfortable', 'spacious'].includes(stored)) {
      return stored as RowHeight;
    }
    return null;
  } catch (error) {
    console.error('Failed to load row height from localStorage:', error);
    return null;
  }
}

/**
 * Save column visibility to localStorage
 */
export function saveColumnVisibility(sheetId: string, visibility: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.columnVisibility(sheetId), JSON.stringify(visibility));
  } catch (error) {
    console.error('Failed to save column visibility to localStorage:', error);
  }
}

/**
 * Load column visibility from localStorage
 */
export function loadColumnVisibility(sheetId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.columnVisibility(sheetId));
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load column visibility from localStorage:', error);
    return {};
  }
}

/**
 * Save hidden columns to localStorage
 */
export function saveHiddenColumns(sheetId: string, columns: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.hiddenColumns(sheetId), JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save hidden columns to localStorage:', error);
  }
}

/**
 * Load hidden columns from localStorage
 */
export function loadHiddenColumns(sheetId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.hiddenColumns(sheetId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load hidden columns from localStorage:', error);
    return [];
  }
}

/**
 * Save pinned columns to localStorage
 */
export function savePinnedColumns(sheetId: string, columns: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.pinnedColumns(sheetId), JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save pinned columns to localStorage:', error);
  }
}

/**
 * Load pinned columns from localStorage
 */
export function loadPinnedColumns(sheetId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.pinnedColumns(sheetId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load pinned columns from localStorage:', error);
    return [];
  }
}

/**
 * Save column order to localStorage
 */
export function saveColumnOrder(sheetId: string, order: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.columnOrder(sheetId), JSON.stringify(order));
  } catch (error) {
    console.error('Failed to save column order to localStorage:', error);
  }
}

/**
 * Load column order from localStorage
 */
export function loadColumnOrder(sheetId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.columnOrder(sheetId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load column order from localStorage:', error);
    return [];
  }
}

export function saveGroupByColumn(sheetId: string, columnId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (columnId === null) {
      localStorage.removeItem(STORAGE_KEYS.groupByColumn(sheetId));
    } else {
      localStorage.setItem(STORAGE_KEYS.groupByColumn(sheetId), columnId);
    }
  } catch (error) {
    console.error('Failed to save group by column:', error);
  }
}

export function loadGroupByColumn(sheetId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.groupByColumn(sheetId));
  } catch (error) {
    console.error('Failed to load group by column:', error);
    return null;
  }
}

export function saveCollapsedGroups(sheetId: string, groups: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.collapsedGroups(sheetId), JSON.stringify(groups));
  } catch (error) {
    console.error('Failed to save collapsed groups:', error);
  }
}

export function loadCollapsedGroups(sheetId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.collapsedGroups(sheetId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load collapsed groups:', error);
    return [];
  }
}

// ============================================
// Views Storage Functions
// ============================================

/**
 * Save user views to localStorage
 */
export function saveViews(sheetId: string, views: UserView[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Only save non-system views (system views are defined in config)
    const userViews = views.filter(v => !v.isSystem);
    localStorage.setItem(STORAGE_KEYS.views(sheetId), JSON.stringify(userViews));
  } catch (error) {
    console.error('Failed to save views to localStorage:', error);
  }
}

/**
 * Load user views from localStorage
 */
export function loadViews(sheetId: string): UserView[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.views(sheetId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load views from localStorage:', error);
    return [];
  }
}

/**
 * Save active view ID to localStorage
 */
export function saveActiveView(sheetId: string, viewId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (viewId === null) {
      localStorage.removeItem(STORAGE_KEYS.activeView(sheetId));
    } else {
      localStorage.setItem(STORAGE_KEYS.activeView(sheetId), viewId);
    }
  } catch (error) {
    console.error('Failed to save active view:', error);
  }
}

/**
 * Load active view ID from localStorage
 */
export function loadActiveView(sheetId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.activeView(sheetId));
  } catch (error) {
    console.error('Failed to load active view:', error);
    return null;
  }
}

/**
 * Save default view ID to localStorage
 */
export function saveDefaultView(sheetId: string, viewId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (viewId === null) {
      localStorage.removeItem(STORAGE_KEYS.defaultView(sheetId));
    } else {
      localStorage.setItem(STORAGE_KEYS.defaultView(sheetId), viewId);
    }
  } catch (error) {
    console.error('Failed to save default view:', error);
  }
}

/**
 * Load default view ID from localStorage
 */
export function loadDefaultView(sheetId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.defaultView(sheetId));
  } catch (error) {
    console.error('Failed to load default view:', error);
    return null;
  }
}

/**
 * Save a single view (updates existing or adds new)
 */
export function saveView(sheetId: string, view: UserView): void {
  const views = loadViews(sheetId);
  const existingIndex = views.findIndex(v => v.id === view.id);
  
  if (existingIndex >= 0) {
    views[existingIndex] = view;
  } else {
    views.push(view);
  }
  
  saveViews(sheetId, views);
}

/**
 * Delete a view by ID
 */
export function deleteView(sheetId: string, viewId: string): void {
  const views = loadViews(sheetId);
  const filteredViews = views.filter(v => v.id !== viewId);
  saveViews(sheetId, filteredViews);
  
  // If the deleted view was active, clear active view
  const activeViewId = loadActiveView(sheetId);
  if (activeViewId === viewId) {
    saveActiveView(sheetId, null);
  }
  
  // If the deleted view was default, clear default view
  const defaultViewId = loadDefaultView(sheetId);
  if (defaultViewId === viewId) {
    saveDefaultView(sheetId, null);
  }
}

export function clearSheetStorage(sheetId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.filters(sheetId));
    localStorage.removeItem(STORAGE_KEYS.columnWidths(sheetId));
    localStorage.removeItem(STORAGE_KEYS.rowHeight(sheetId));
    localStorage.removeItem(STORAGE_KEYS.columnVisibility(sheetId));
    localStorage.removeItem(STORAGE_KEYS.hiddenColumns(sheetId));
    localStorage.removeItem(STORAGE_KEYS.pinnedColumns(sheetId));
    localStorage.removeItem(STORAGE_KEYS.columnOrder(sheetId));
    localStorage.removeItem(STORAGE_KEYS.groupByColumn(sheetId));
    localStorage.removeItem(STORAGE_KEYS.collapsedGroups(sheetId));
    localStorage.removeItem(STORAGE_KEYS.views(sheetId));
    localStorage.removeItem(STORAGE_KEYS.activeView(sheetId));
    localStorage.removeItem(STORAGE_KEYS.defaultView(sheetId));
  } catch (error) {
    console.error('Failed to clear sheet storage:', error);
  }
}

// ============================================
// Per-View State Storage Functions
// These store view-specific state separately (used for system views)
// ============================================

/**
 * Save filters for a specific view
 */
export function saveViewFilters(sheetId: string, viewId: string, filters: Record<string, ColumnFilter>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.viewFilters(sheetId, viewId), JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save view filters:', error);
  }
}

/**
 * Load filters for a specific view
 */
export function loadViewFilters(sheetId: string, viewId: string): Record<string, ColumnFilter> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.viewFilters(sheetId, viewId));
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load view filters:', error);
    return {};
  }
}

/**
 * Save hidden columns for a specific view
 */
export function saveViewHiddenColumns(sheetId: string, viewId: string, columns: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.viewHiddenColumns(sheetId, viewId), JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save view hidden columns:', error);
  }
}

/**
 * Load hidden columns for a specific view
 */
export function loadViewHiddenColumns(sheetId: string, viewId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.viewHiddenColumns(sheetId, viewId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load view hidden columns:', error);
    return [];
  }
}

/**
 * Save pinned columns for a specific view
 */
export function saveViewPinnedColumns(sheetId: string, viewId: string, columns: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.viewPinnedColumns(sheetId, viewId), JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save view pinned columns:', error);
  }
}

/**
 * Load pinned columns for a specific view
 */
export function loadViewPinnedColumns(sheetId: string, viewId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.viewPinnedColumns(sheetId, viewId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load view pinned columns:', error);
    return [];
  }
}

/**
 * Save column order for a specific view
 */
export function saveViewColumnOrder(sheetId: string, viewId: string, order: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.viewColumnOrder(sheetId, viewId), JSON.stringify(order));
  } catch (error) {
    console.error('Failed to save view column order:', error);
  }
}

/**
 * Load column order for a specific view
 */
export function loadViewColumnOrder(sheetId: string, viewId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.viewColumnOrder(sheetId, viewId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load view column order:', error);
    return [];
  }
}

/**
 * Save sorts for a specific view
 */
export function saveViewSorts(sheetId: string, viewId: string, sorts: Sort[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.viewSorts(sheetId, viewId), JSON.stringify(sorts));
  } catch (error) {
    console.error('Failed to save view sorts:', error);
  }
}

/**
 * Load sorts for a specific view
 */
export function loadViewSorts(sheetId: string, viewId: string): Sort[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.viewSorts(sheetId, viewId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load view sorts:', error);
    return [];
  }
}

/**
 * Save groupBy column for a specific view
 */
export function saveViewGroupBy(sheetId: string, viewId: string, columnId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (columnId === null) {
      localStorage.removeItem(STORAGE_KEYS.viewGroupBy(sheetId, viewId));
    } else {
      localStorage.setItem(STORAGE_KEYS.viewGroupBy(sheetId, viewId), columnId);
    }
  } catch (error) {
    console.error('Failed to save view groupBy:', error);
  }
}

/**
 * Load groupBy column for a specific view
 */
export function loadViewGroupBy(sheetId: string, viewId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.viewGroupBy(sheetId, viewId));
  } catch (error) {
    console.error('Failed to load view groupBy:', error);
    return null;
  }
}

