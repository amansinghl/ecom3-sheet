// User and Authentication Types
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
  | 'user';

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
  [key: string]: any; // Dynamic columns
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
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

// View Definition
export interface ViewConfig {
  id: string;
  name: string;
  description?: string;
  filters: Filter[];
  isDefault?: boolean;
}

// View State
export interface ViewState {
  columnFilters: Record<string, ColumnFilter>; // Per-column filters
  sorts: Sort[];
  searchQuery: string;
  hiddenColumns: string[];
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
