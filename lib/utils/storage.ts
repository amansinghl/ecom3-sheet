/**
 * Utility functions for managing persistent state in localStorage
 */

import { ColumnFilter } from '@/types';
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
  } catch (error) {
    console.error('Failed to clear sheet storage:', error);
  }
}

