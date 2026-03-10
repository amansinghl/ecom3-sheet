// User and Authentication Types hai idhar
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// Cell Data Types
export type CellType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'checkbox'
  | 'email'
  | 'phone'
  | 'url'
  | 'status'
  | 'user'
  | 'user-avatar'
  | 'highlights'
  | 'action-button';

export interface DropdownOption {
  label: string;
  value: string;
  color?: string;
}

export interface StatusOption extends DropdownOption {
  color: string; // Required for status
}

// Column Definition
export interface ColumnConfig {
  id: string;
  label: string;
  type: CellType;
  width?: number;
  required?: boolean;
  editable?: boolean;
  options?: DropdownOption[] | StatusOption[]; // For dropdown, multiselect, status
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  backgroundColor?: string; // Background color for the column
  fixed?: boolean; // If true, column is fixed at the beginning and cannot be moved or hidden from column config
}

// Sheet Configuration
export interface SheetConfig {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  columns: ColumnConfig[];
  views?: ViewConfig[]; // Predefined views for the sheet
  defaultSort?: {
    columnId: string;
    direction: 'asc' | 'desc';
  };
  permissions?: {
    [key in UserRole]?: {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canExport: boolean;
    };
  };
}

// Row Data
export interface RowData {
  id: string;
  [key: string]: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// Group Header for row grouping
export interface GroupHeader {
  _isGroupHeader: true;
  _groupId: string;
  groupValue: string;
  count: number;
  isCollapsed: boolean;
}

// Filter Types
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isAnyOf';

export interface Filter {
  columnId: string;
  operator: FilterOperator;
  value: any;
}

// Per-Column Filter Types (for Google Sheets-style filtering)
export type ColumnFilterType = 'condition' | 'values';

export interface ColumnFilter {
  type: ColumnFilterType;
  // For condition-based filtering
  condition?: {
    operator: FilterOperator;
    value: any;
  };
  // For value-based filtering (selected values to show)
  values?: any[];
}

// Sort Type
export interface Sort {
  columnId: string;
  direction: 'asc' | 'desc';
}

// View Definition (for system/config views)
export interface ViewConfig {
  id: string;
  name: string;
  description?: string;
  filters: Filter[];
  isDefault?: boolean;
}

// User View (extended view with all saved state)
export interface UserView {
  id: string;
  name: string;
  description?: string;
  filters: Filter[];
  isDefault?: boolean;
  isSystem?: boolean; // true for system views (Open/Closed) - cannot be deleted
  icon?: string; // lucide icon name
  color?: string; // hex color for visual distinction
  // Saved view state
  hiddenColumns: string[];
  pinnedColumns: string[];
  columnOrder: string[];
  sorts: Sort[];
  groupByColumn: string | null;
  // Metadata
  createdAt: string; // ISO string for localStorage
  updatedAt: string;
}

// Views state for localStorage
export interface ViewsStorageState {
  views: UserView[];
  activeViewId: string | null;
  defaultViewId: string | null;
}

// View State
export interface ViewState {
  columnFilters: Record<string, ColumnFilter>; // Per-column filters
  sorts: Sort[];
  searchQuery: string;
  hiddenColumns: string[];
  pinnedColumns: string[]; // Columns pinned to the left
  visibleRowIds?: Set<string>;
  filterSnapshot?: Record<string, ColumnFilter>;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
