'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { SheetConfig, RowData, UserRole, ColumnFilter, UserView } from '@/types';
import { DataGrid } from './data-grid';
import { Toolbar, ToolbarRef } from './toolbar';
import { CommandPalette } from './command-palette';
import { TableSkeleton } from './table-skeleton';
import { ViewsSidebar } from './views-sidebar';
import { ViewCreateDialog } from './view-create-dialog';
import { HeroSection } from './hero-section';
import { BulkUploadModal } from './bulk-upload-modal';
import { useSheetStore } from '@/lib/store/sheet-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { loadColumnVisibility, saveColumnVisibility } from '@/lib/utils/storage';
import { useSheetData } from '@/hooks/use-sheet-data';
import { toast } from 'sonner';
import { sheetApiService } from '@/lib/api/sheets';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';

interface SheetViewProps {
  config: SheetConfig;
  userRole: UserRole;
}

export function SheetView({ config, userRole }: SheetViewProps) {
  // Get user session for personalized views
  const { data: session } = useSession();
  
  // Ref to track row ID counter for unique temporary row IDs
  const rowIdCounterRef = useRef(0);
  const userName = session?.user?.name || 'User';
  
  const [data, setData] = useState<RowData[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { 
    viewState, 
    selectedRows, 
    clearSelection, 
    setEditingCell, 
    editingCell, // Get editing state to disable refetch while editing
    clearAllFilters,
    setColumnFilter,
    loadViewStateForSheet,
    loadColumnWidthsForSheet,
    loadColumnOrderForSheet,
    loadGroupingForSheet,
    setActiveSheetId,
    pushToHistory,
    undo: undoFromStore,
    redo: redoFromStore,
    // Views management from store
    views,
    activeViewId: storeActiveViewId,
    defaultViewId,
    loadViewsForSheet,
    addView,
    updateView,
    deleteView: storeDeleteView,
    duplicateView: storeDuplicateView,
    setActiveViewId: storeSetActiveViewId,
    setDefaultViewId,
    applyView,
    getCurrentViewState,
  } = useSheetStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingView, setEditingView] = useState<UserView | null>(null);
  const [viewDialogMode, setViewDialogMode] = useState<'create' | 'edit'>('create');
  const toolbarRef = useRef<ToolbarRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch sheet data from API based on sheet ID
  // Disable auto-refetch while editing to prevent overwriting user's edits
  const isEditing = !!editingCell;
  const { 
    data: apiData, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useSheetData(
    config.id === 'escalations' ? 'escalation' : config.id,
    {
      enabled: config.id !== 'portfolio', // Don't fetch for portfolio sheet
      isEditing, // Pass editing state to disable refetch while editing
    }
  );

  // View management - use store values
  const activeViewId = storeActiveViewId;
  const activeView = views.find((v) => v.id === activeViewId);

  useEffect(() => {
    setActiveSheetId(config.id);
    loadViewStateForSheet(config.id);
    loadColumnWidthsForSheet(config.id);
    loadColumnOrderForSheet(config.id);
    loadGroupingForSheet(config.id);
    // Load views from localStorage and merge with system views from config
    // Pass userName to create a default personal view if none exists
    // This also applies the active view's state (filters, columns, etc.)
    loadViewsForSheet(config.id, config.views, userName);
  }, [config.id, setActiveSheetId, loadViewStateForSheet, loadColumnWidthsForSheet, loadColumnOrderForSheet, loadGroupingForSheet, loadViewsForSheet, config.views, userName]);

  // Update data when API data changes
  useEffect(() => {
    if (apiData) {
      // Map the API response id to escalation_id for escalations sheet
      const processedData = apiData.map((row: RowData) => {
        if (config.id === 'escalations' && row.id !== undefined) {
          return {
            ...row,
            escalation_id: row.id, // Map id to escalation_id for display
          };
        }
        return row;
      });
      setData(processedData);
      setLocalError(null);
    }
  }, [apiData, config.id]);

  // Handle API errors
  useEffect(() => {
    if (isError && error) {
      const errorMessage = error.message || 'Failed to load sheet data';
      setLocalError(errorMessage);
      toast.error(errorMessage);
      
      // Fallback to mock data if portfolio sheet, otherwise show error
      if (config.id === 'portfolio') {
        setData([]);
      } else {
        console.error('Sheet data error:', error);
      }
    }
  }, [isError, error, config.id]);

  // Apply filters and add empty rows
  const filteredData = useMemo(() => {
    let result = data;

    const isTemporaryRow = (row: RowData) => {
      const idString = String(row.id);
      return idString.startsWith('row-');
    };

    // Apply column filters
    if (Object.keys(viewState.columnFilters).length > 0) {
      const { applyFilters } = require('@/lib/utils/filter-data');
      const existingRows = result.filter((row) => !isTemporaryRow(row));
      const filteredExistingRows = applyFilters(existingRows, viewState.columnFilters, config.columns, config.id);
      const filteredIds = new Set(filteredExistingRows.map((row: RowData) => String(row.id)));
      
      result = result.filter((row) => isTemporaryRow(row) || filteredIds.has(String(row.id)));
    }


    // Apply global search across visible data (excluding empty rows)
    if (globalSearch.trim()) {
      const searchTerm = globalSearch.trim().toLowerCase();
      result = result.filter((row) => {
        const idString = String(row.id);
        // Skip placeholder empty rows
        if (idString.startsWith('empty-')) return false;
        // Always include temporary rows (new unsaved rows)
        if (idString.startsWith('row-')) return true;

        return config.columns.some((column) => {
          const value = row[column.id];
          if (value === null || value === undefined) return false;

          let stringValue: string;
          if (value instanceof Date) {
            stringValue = value.toISOString();
          } else if (typeof value === 'object') {
            try {
              stringValue = JSON.stringify(value);
            } catch {
              stringValue = String(value);
            }
          } else {
            stringValue = String(value);
          }

          return stringValue.toLowerCase().includes(searchTerm);
        });
      });
    }

    // Get list of filled empty row IDs to skip
    const filledEmptyIds = new Set(
      data.filter(row => String(row.id).startsWith('empty-') && row._isFilled).map(row => row.id)
    );

    // Add 50 empty editable rows at the bottom (virtual scrolling handles rendering)
    // Skip rows that have been filled
    const emptyRows = Array.from({ length: 50 }, (_, i) => {
      const emptyId = `empty-${i}`;
      
      // Skip if this empty row has been filled
      if (filledEmptyIds.has(emptyId)) {
        return null;
      }
      
      const emptyRow: any = {
        id: emptyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
        _isEmpty: true, // Mark as empty row
      };

      config.columns.forEach((col) => {
        emptyRow[col.id] = null;
      });

      // Set is_closed to 0 (open) by default for escalation sheet empty rows
      // This ensures empty rows are visible in the "Open Escalations" view
      if (config.id === 'escalations') {
        emptyRow.is_closed = 0;
      }

      return emptyRow;
    }).filter(Boolean); // Remove null entries

    // Identify and mark duplicate rows based on shipment_no + manual_case combination
    // For escalations sheet: only when viewing open escalations (is_closed === 0)
    // For LSD sheet: always check for duplicates
    if (config.id === 'escalations') {
      // Check if we're viewing open escalations (is_closed === 0)
      // This works for both system views and custom views
      const isOpenEscalationsView = 
        activeViewId === 'open' || 
        (viewState.columnFilters['is_closed']?.condition?.operator === 'equals' && 
         viewState.columnFilters['is_closed']?.condition?.value === 0) ||
        // Check if the active view has filters that show open escalations
        (activeView && activeView.filters?.some(
          (filter: any) => filter.columnId === 'is_closed' && 
                          filter.operator === 'equals' && 
                          filter.value === 0
        )) ||
        // Fallback: Check if filtered data contains open escalations
        result.some((row) => {
          const idString = String(row.id);
          if (idString.startsWith('row-') || idString.startsWith('empty-')) return false;
          return row.is_closed === 0;
        });
      
      // Only process duplicates if viewing open escalations
      if (isOpenEscalationsView) {
        // Group rows by shipment_no + manual_case combination
        const duplicateMap = new Map<string, RowData[]>();
        
        result.forEach((row) => {
          const idString = String(row.id);
          // Skip temporary and empty rows
          if (idString.startsWith('row-') || idString.startsWith('empty-')) return;
          
          const shipmentNo = row.shipment_no;
          const manualCase = row.manual_case;
          
          // Skip rows with empty/null/undefined manual_case - duplicates only apply when manual_case has a value
          if (!manualCase || manualCase === '' || manualCase === null || manualCase === undefined) {
            return;
          }
          
          // Create a key from shipment_no and manual_case
          const key = `${shipmentNo || ''}_${manualCase}`;
          
          if (!duplicateMap.has(key)) {
            duplicateMap.set(key, []);
          }
          duplicateMap.get(key)!.push(row);
        });
        
        // Process duplicates: keep lowest id, mark others
        duplicateMap.forEach((rows) => {
          if (rows.length > 1) {
            // Sort by id (convert to number if possible, otherwise string comparison)
            rows.sort((a, b) => {
              const idA = typeof a.id === 'number' ? a.id : parseInt(String(a.id), 10);
              const idB = typeof b.id === 'number' ? b.id : parseInt(String(b.id), 10);
              
              // If both are valid numbers, compare numerically
              if (!isNaN(idA) && !isNaN(idB)) {
                return idA - idB;
              }
              // Otherwise compare as strings
              return String(a.id).localeCompare(String(b.id));
            });
            
            // Keep the first one (lowest id) normal, mark others as duplicates
            for (let i = 1; i < rows.length; i++) {
              rows[i].duplicate_awb = 'Duplicate Entry, will be deleted in 15 minutes';
              rows[i]._isDuplicate = true; // Flag for styling
            }
          }
        });
      } else {
        // Clear duplicate flags when not in Open Escalations view
        result.forEach((row) => {
          if (row._isDuplicate) {
            delete row._isDuplicate;
            if (row.duplicate_awb === 'Duplicate Entry, will be deleted in 15 minutes') {
              row.duplicate_awb = null;
            }
          }
        });
      }
    } else if (config.id === 'lsd') {
      // For LSD sheet: always check for duplicates based on manual_case + shipment_no
      // Group rows by shipment_no + manual_case combination
      const duplicateMap = new Map<string, RowData[]>();
      
      result.forEach((row) => {
        const idString = String(row.id);
        // Skip temporary and empty rows
        if (idString.startsWith('row-') || idString.startsWith('empty-')) return;
        
        const shipmentNo = row.shipment_no;
        const manualCase = row.manual_case;
        
        // Skip rows with empty/null/undefined manual_case or shipment_no
        if (!manualCase || manualCase === '' || manualCase === null || manualCase === undefined ||
            !shipmentNo || shipmentNo === '' || shipmentNo === null || shipmentNo === undefined) {
          return;
        }
        
        // Create a key from shipment_no and manual_case
        const key = `${shipmentNo}_${manualCase}`;
        
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key)!.push(row);
      });
      
      // Process duplicates: mark all entries EXCEPT the oldest (lowest ID) as duplicate (highlight in red)
      duplicateMap.forEach((rows) => {
        if (rows.length > 1) {
          // Sort by id (lowest id = oldest entry first)
          rows.sort((a, b) => {
            const idA = typeof a.id === 'number' ? a.id : parseInt(String(a.id), 10);
            const idB = typeof b.id === 'number' ? b.id : parseInt(String(b.id), 10);
            
            // If both are valid numbers, compare numerically (ascending - lowest first)
            if (!isNaN(idA) && !isNaN(idB)) {
              return idA - idB; // Ascending order (lowest ID first = oldest)
            }
            // Otherwise compare as strings (ascending)
            return String(a.id).localeCompare(String(b.id));
          });
          
          // Keep the oldest entry (first one after sorting - lowest ID) normal (not highlighted)
          // Mark all other entries (newer ones) as duplicates (highlight in red)
          for (let i = 1; i < rows.length; i++) {
            rows[i]._isDuplicate = true; // Flag for styling - highlight newer entries in red
          }
          
          // Ensure oldest entry is not highlighted
          if (rows[0]._isDuplicate) {
            delete rows[0]._isDuplicate;
          }
        }
      });
    }

    // For LSD sheet: sort by ID ascending (oldest at top, latest at bottom) if no manual sort is applied
    if (config.id === 'lsd' && viewState.sorts.length === 0) {
      result = [...result].sort((a, b) => {
        const idA = typeof a.id === 'number' ? a.id : parseInt(String(a.id || 0), 10);
        const idB = typeof b.id === 'number' ? b.id : parseInt(String(b.id || 0), 10);
        
        // Skip temporary and empty rows - keep them at their position
        const aIsTemp = String(a.id).startsWith('row-') || String(a.id).startsWith('empty-');
        const bIsTemp = String(b.id).startsWith('row-') || String(b.id).startsWith('empty-');
        
        if (aIsTemp && !bIsTemp) return 1; // Temp rows go to bottom
        if (!aIsTemp && bIsTemp) return -1; // Real rows stay on top
        if (aIsTemp && bIsTemp) return 0; // Keep temp rows in their order
        
        // Sort by ID ascending (oldest first, latest last)
        if (!isNaN(idA) && !isNaN(idB)) {
          return idA - idB;
        }
        return String(a.id).localeCompare(String(b.id));
      });
    }

    return [...result, ...emptyRows];
  }, [data, viewState.columnFilters, config.columns, config.id, globalSearch, activeViewId, activeView, viewState.sorts.length]);

  const visibleRowCount = useMemo(() => {
    return filteredData.filter((row) => !String(row.id).startsWith('empty-')).length;
  }, [filteredData]);

  /**
   * Parse shipment numbers from comma or space separated string
   */
  const parseShipmentNumbers = (value: any): string[] => {
    if (!value) return [];
    const str = String(value).trim();
    if (!str) return [];
    
    // Split by comma or space (or both)
    const numbers = str
      .split(/[,\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    return numbers;
  };

  /**
   * Process a single shipment number with manual_case
   */
  const processShipmentWithManualCase = async (
    shipmentNo: string,
    rowId: string,
    manualCase?: string
  ) => {
    try {
      toast.loading(`Fetching details for shipment ${shipmentNo}...`, { id: `fetch-${shipmentNo}` });
      const response = await sheetApiService.updateEscalationSheet(shipmentNo);
      
      if (response.data?.escalation) {
        const backendId = response.data.escalation.id;
        const vamashipper = response.data.escalation.vamashipper || '';
        
        // Update the row with data from backend
        setData((prev) =>
          prev.map((row) => {
            if (String(row.id) === rowId) {
              return {
                ...row,
                ...response.data.escalation,
                id: backendId,
                manual_case: manualCase || row.manual_case || null,
                updatedAt: new Date(),
              };
            }
            return row;
          })
        );
        
        // If manual_case was provided, update it in the database
        if (manualCase) {
          try {
            toast.loading(`Updating manual case for shipment ${shipmentNo}...`, { id: `update-${shipmentNo}` });
            await sheetApiService.updateEscalationEntries(backendId, {
              manual_case: manualCase,
              vamashipper: vamashipper,
            });
            toast.success(`Manual case updated for shipment ${shipmentNo}`, { id: `update-${shipmentNo}` });
          } catch (updateError: any) {
            console.error(`Failed to update manual case for ${shipmentNo}:`, updateError);
            toast.error(updateError.message || `Failed to update manual case`, { id: `update-${shipmentNo}` });
          }
        }
        
        toast.success(`Shipment ${shipmentNo} loaded successfully`, { id: `fetch-${shipmentNo}` });
        return backendId;
      } else {
        toast.error(`No data received for shipment ${shipmentNo}`, { id: `fetch-${shipmentNo}` });
        return null;
      }
    } catch (error: any) {
      console.error(`Failed to fetch escalation details for ${shipmentNo}:`, error);
      toast.error(error.message || `Failed to fetch details for shipment ${shipmentNo}`, { id: `fetch-${shipmentNo}` });
      return null;
    }
  };

  /**
   * Process a single LSD shipment number
   */
  const processLSDShipment = async (
    shipmentNo: string,
    rowId: string
  ) => {
    try {
      toast.loading(`Fetching LSD details for shipment ${shipmentNo}...`, { id: `fetch-lsd-${shipmentNo}` });
      const response = await sheetApiService.updateLSDSheet(shipmentNo);
      
      // Extract response data - handle different response structures
      let responseData: any = null;
      let backendId: number | string | null = null;
      
      // Check for lsd_record (actual API response structure)
      if (response.data?.lsd_record) {
        responseData = response.data.lsd_record;
        backendId = responseData.id;
      } 
      // Check for lsd (alternative structure)
      else if (response.data?.lsd) {
        responseData = response.data.lsd;
        backendId = responseData.id;
      } 
      // Try flat structure
      else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Check if response.data itself has an id (flat structure)
        if (response.data.id) {
          responseData = response.data;
          backendId = response.data.id;
        } else {
          // Try to find the first object with an id
          for (const key in response.data) {
            if (response.data[key] && typeof response.data[key] === 'object' && response.data[key].id) {
              responseData = response.data[key];
              backendId = response.data[key].id;
              break;
            }
          }
        }
      }
      
      if (responseData && backendId) {
        // Update the row with data from backend
        setData((prev) => {
          const rowExists = prev.some((row) => String(row.id) === rowId);
          
          if (rowExists) {
            // Update existing row
            return prev.map((row) => {
              if (String(row.id) === rowId) {
                return {
                  ...row,
                  ...responseData,
                  id: backendId,
                  shipment_no: shipmentNo, // Ensure shipment_no is set
                  updatedAt: new Date(),
                };
              }
              return row;
            });
          } else {
            // Row doesn't exist, add it
            return [
              ...prev,
              {
                ...responseData,
                id: backendId,
                shipment_no: shipmentNo,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
        });
        
        toast.success(`LSD details for shipment ${shipmentNo} loaded successfully`, { id: `fetch-lsd-${shipmentNo}` });
        
        // Auto-focus on manual_case after data is loaded
        // Use setTimeout to ensure state has updated with the new backendId
        setTimeout(() => {
          const manualCaseColumn = config.columns.find((col) => col.id === 'manual_case');
          if (manualCaseColumn && backendId) {
            // Use the backendId which is now the row's ID
            setEditingCell({ rowId: String(backendId), columnId: 'manual_case' });
          }
        }, 500);
        
        return backendId;
      } else {
        console.error('LSD API Response:', response);
        toast.error(`No data received for shipment ${shipmentNo}`, { id: `fetch-lsd-${shipmentNo}` });
        return null;
      }
    } catch (error: any) {
      console.error(`Failed to fetch LSD details for ${shipmentNo}:`, error);
      toast.error(error.message || `Failed to fetch LSD details for shipment ${shipmentNo}`, { id: `fetch-lsd-${shipmentNo}` });
      return null;
    }
  };

  const handleCellUpdate = async (rowId: string, columnId: string, value: any) => {
    // Check if this is the shipment_no column for escalation or LSD sheet
    // Check for null/undefined explicitly to allow 0 as a valid value
    const isShipmentNoUpdate = columnId === 'shipment_no' && (config.id === 'escalations' || config.id === 'lsd') && (value !== null && value !== undefined && value !== '');
    const isLSDShipmentNoUpdate = columnId === 'shipment_no' && config.id === 'lsd' && (value !== null && value !== undefined && value !== '');

    // Convert rowId to string to handle cases where it might be a number from API
    const rowIdString = String(rowId);
    
    // Get the old value for undo/redo history
    const currentRow = data.find((row) => String(row.id) === rowIdString);
    const oldValue = currentRow?.[columnId];
    
    // Only push to history if value actually changed
    if (oldValue !== value && currentRow) {
      pushToHistory({
        rowId: rowIdString,
        columnId,
        oldValue,
        newValue: value,
      });
    }

    // Prevent shipment_no updates for existing rows (rows with numeric IDs)
    if (isShipmentNoUpdate) {
      const currentRow = data.find((row) => String(row.id) === rowIdString);
      const actualRowId = currentRow?.id;
      const isExistingRow = typeof actualRowId === 'number' || (typeof actualRowId === 'string' && !actualRowId.startsWith('row-') && !actualRowId.startsWith('empty-'));
      
      if (isExistingRow) {
        const sheetName = config.id === 'escalations' ? 'escalations' : config.id === 'lsd' ? 'LSD entries' : 'entries';
        toast.error(`Shipment number cannot be changed for existing ${sheetName}`);
        return;
      }
    }

    // Fields that should trigger the update-entries API call for escalation sheet
    const escalationUpdatableFields = [
      'notes',
      'manual_case',
      'followup_remarks',
      'ops_remarks',
      'source_of_complaint',
      'manual_ticket_status',
      'email_subject',
      'lr_number',
      'closure_datetime', // Also handle closure_datetime
    ];

    // Fields that should trigger the update-entries API call for LSD sheet
    // All editable fields in LSD sheet should trigger API call
    const lsdUpdatableFields = [
      'credit_note_refund',
      'shipment_no',
      'lost_damage_service_failure',
      'credit_note_refund_2',
      'credit_note_amount_to_customer',
      'remarks',
      'finance_update',
      'credit_note_no_utr_no',
      'credit_note_date_refund_date',
      'credit_note_refund_amount',
      'ops_name',
      'investigation_status',
      'partner_debit_note_no_utr_no',
      'partner_debit_note_date_refund_date',
      'partner_debit_note_amount_refund_amount',
      'operations_remarks',
      'partners_email_subject',
      'email_link_of_partner',
      'partners_email_subject_for_cn_followup',
      'email_link_of_partner_for_cn',
      'approved_by_ops_lead',
      'manual_case',
    ];

    // Check if this is an updatable field
    const isUpdatableField = 
      (config.id === 'escalations' && escalationUpdatableFields.includes(columnId)) ||
      (config.id === 'lsd' && lsdUpdatableFields.includes(columnId));

    // Check if this is an empty row being edited
    if (rowIdString.startsWith('empty-')) {
      // Extract the empty row index
      const emptyIndex = parseInt(rowIdString.replace('empty-', ''));
      
      // If shipment number was entered in empty row, fetch details from backend and create new row
      if (isShipmentNoUpdate) {
        // Parse shipment numbers (handle comma/space separated)
        const shipmentNumbers = parseShipmentNumbers(value);
        
        if (shipmentNumbers.length === 0) {
          toast.error('Please enter at least one shipment number');
          return;
        }
        
        if (shipmentNumbers.length === 1) {
          // Single shipment number - use existing flow
          const tempRow: any = {
            id: rowIdString,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user-1',
            updatedBy: 'user-1',
            _isFilled: true,
          };
          
          config.columns.forEach((col) => {
            tempRow[col.id] = col.id === columnId ? shipmentNumbers[0] : col.defaultValue || null;
          });
          
          if (config.id === 'escalations') {
            tempRow.is_closed = 0;
          }
          
          setData((prev) => [...prev, tempRow]);
          
          // Defer API call to next tick so UI updates immediately (prevents paste lag)
          setTimeout(async () => {
            try {
              if (config.id === 'lsd') {
                // Handle LSD sheet
                await processLSDShipment(shipmentNumbers[0], rowIdString);
              } else {
                // Handle escalation sheet
                toast.loading('Fetching escalation details...', { id: 'fetch-escalation' });
                const response = await sheetApiService.updateEscalationSheet(shipmentNumbers[0]);
                
                if (response.data?.escalation) {
                  const backendId = response.data.escalation.id;
                  setData((prev) =>
                    prev.map((row) => {
                      if (String(row.id) === rowIdString) {
                        return {
                          ...row,
                          ...response.data.escalation,
                          id: backendId,
                          updatedAt: new Date(),
                        };
                      }
                      return row;
                    })
                  );
                  toast.success('Escalation details loaded successfully', { id: 'fetch-escalation' });
                  
                  setTimeout(() => {
                    const manualCaseColumn = config.columns.find((col) => col.id === 'manual_case');
                    if (manualCaseColumn) {
                      setEditingCell({ rowId: backendId, columnId: 'manual_case' });
                    }
                  }, 100);
                } else {
                  toast.error('No escalation data received', { id: 'fetch-escalation' });
                }
              }
            } catch (error: any) {
              console.error('Failed to fetch details:', error);
              const errorMsg = config.id === 'lsd' ? 'Failed to fetch LSD details' : 'Failed to fetch escalation details';
              toast.error(error.message || errorMsg, { id: 'fetch-escalation' });
            }
          }, 0);
        } else {
          // Multiple shipment numbers - create rows and process all directly
          toast.info(`Processing ${shipmentNumbers.length} shipments...`);
          
          for (let index = 0; index < shipmentNumbers.length; index++) {
            const shipmentNo = shipmentNumbers[index];
            // Use unique counter-based ID to prevent duplicate keys
            const newRowId = index === 0 ? rowIdString : `row-${Date.now()}-${++rowIdCounterRef.current}`;
            const tempRow: any = {
              id: newRowId,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'user-1',
              updatedBy: 'user-1',
              _isFilled: true,
            };
            
            config.columns.forEach((col) => {
              tempRow[col.id] = col.id === columnId ? shipmentNo : col.defaultValue || null;
            });
            
            if (config.id === 'escalations') {
              tempRow.is_closed = 0;
            }
            
            setData((prev) => [...prev, tempRow]);
            
            // Process each shipment directly without showing dialog
            if (config.id === 'lsd') {
              processLSDShipment(shipmentNo, newRowId);
            } else {
              processShipmentWithManualCase(shipmentNo, newRowId);
            }
          }
        }
      } else {
        // Not a shipment number update, just fill the empty row with the entered value
        const filledRow: any = {
          id: rowIdString, // Keep the empty row ID
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          _isFilled: true, // Mark as filled
        };

        config.columns.forEach((col) => {
          filledRow[col.id] = col.id === columnId ? value : col.defaultValue || null;
        });

        // Add the filled row to data
        setData((prev) => [...prev, filledRow]);
      }
    } else if (rowIdString.startsWith('row-')) {
      // This is a new row (not empty, but not saved to backend yet)
      const currentRow = data.find((row) => String(row.id) === rowIdString);
      
      // If updating shipment_no in a new row, fetch details and auto-focus manual_case
      if (isShipmentNoUpdate) {
        // Parse shipment numbers (handle comma/space separated)
        const shipmentNumbers = parseShipmentNumbers(value);
        
        if (shipmentNumbers.length === 0) {
          toast.error('Please enter at least one shipment number');
          return;
        }
        
        if (shipmentNumbers.length === 1) {
          // Single shipment number - use existing flow
          setData((prev) =>
            prev.map((row) => {
              if (String(row.id) === rowIdString) {
                return {
                  ...row,
                  [columnId]: shipmentNumbers[0],
                  updatedAt: new Date(),
                };
              }
              return row;
            })
          );

          // Defer API call to next tick so UI updates immediately (prevents paste lag)
          setTimeout(async () => {
            try {
              if (config.id === 'lsd') {
                // Handle LSD sheet
                await processLSDShipment(shipmentNumbers[0], rowIdString);
              } else {
                // Handle escalation sheet
                toast.loading('Fetching escalation details...', { id: 'fetch-escalation' });
                const response = await sheetApiService.updateEscalationSheet(shipmentNumbers[0]);
                
                if (response.data?.escalation) {
                  const backendId = response.data.escalation.id;
                  setData((prev) =>
                    prev.map((row) => {
                      if (String(row.id) === rowIdString) {
                        return {
                          ...row,
                          ...response.data.escalation,
                          id: backendId,
                          updatedAt: new Date(),
                        };
                      }
                      return row;
                    })
                  );
                  toast.success('Escalation details loaded successfully', { id: 'fetch-escalation' });
                  
                  setTimeout(() => {
                    const manualCaseColumn = config.columns.find((col) => col.id === 'manual_case');
                    if (manualCaseColumn) {
                      setEditingCell({ rowId: backendId, columnId: 'manual_case' });
                    }
                  }, 100);
                }
              }
            } catch (error: any) {
              console.error('Failed to fetch details:', error);
              const errorMsg = config.id === 'lsd' ? 'Failed to fetch LSD details' : 'Failed to fetch escalation details';
              toast.error(error.message || errorMsg, { id: 'fetch-escalation' });
            }
          }, 0);
        } else {
          // Multiple shipment numbers - create additional rows and process all directly
          toast.info(`Processing ${shipmentNumbers.length} shipments...`);
          
          // Update current row with first shipment
          setData((prev) =>
            prev.map((row) => {
              if (String(row.id) === rowIdString) {
                return {
                  ...row,
                  [columnId]: shipmentNumbers[0],
                  updatedAt: new Date(),
                };
              }
              return row;
            })
          );
          
          // Process first shipment
          if (config.id === 'lsd') {
            processLSDShipment(shipmentNumbers[0], rowIdString);
          } else {
            processShipmentWithManualCase(shipmentNumbers[0], rowIdString);
          }
          
          // Create additional rows for remaining shipments and process them
          shipmentNumbers.slice(1).forEach((shipmentNo, index) => {
            const newRowId = `row-${Date.now()}-${++rowIdCounterRef.current}`;
            const tempRow: any = {
              id: newRowId,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'user-1',
              updatedBy: 'user-1',
              _isFilled: true,
            };
            
            config.columns.forEach((col) => {
              tempRow[col.id] = col.id === columnId ? shipmentNo : col.defaultValue || null;
            });
            
            if (config.id === 'escalations') {
              tempRow.is_closed = 0;
            }
            
            setData((prev) => [...prev, tempRow]);
            
            // Process this shipment directly without showing dialog
            if (config.id === 'lsd') {
              processLSDShipment(shipmentNo, newRowId);
            } else {
              processShipmentWithManualCase(shipmentNo, newRowId);
            }
          });
        }
      } else {
        // For other columns in new row, just update the value
        setData((prev) =>
          prev.map((row) => {
            if (String(row.id) === rowIdString) {
              return {
                ...row,
                [columnId]: value,
                updatedAt: new Date(),
              };
            }
            return row;
          })
        );
        
        // Sequential flow for LSD sheet in new rows: manual_case -> credit_note_refund -> remarks
        if (config.id === 'lsd') {
          if (columnId === 'manual_case') {
            // After manual_case is saved, auto-focus on credit_note_refund
            setTimeout(() => {
              const creditNoteRefundColumn = config.columns.find((col) => col.id === 'credit_note_refund');
              if (creditNoteRefundColumn) {
                setEditingCell({ rowId: rowIdString, columnId: 'credit_note_refund' });
              }
            }, 100);
          } else if (columnId === 'credit_note_refund') {
            // After credit_note_refund is saved, auto-focus on remarks
            setTimeout(() => {
              const remarksColumn = config.columns.find((col) => col.id === 'remarks');
              if (remarksColumn) {
                setEditingCell({ rowId: rowIdString, columnId: 'remarks' });
              }
            }, 100);
          }
        }
      }
    } else {
      // Update existing row
      // Find the row to get its actual ID (might be a number from API)
      const currentRow = data.find((row) => String(row.id) === rowIdString);
      const actualRowId = currentRow?.id;

      setData((prev) =>
        prev.map((row) => {
          if (String(row.id) === rowIdString) {
            return {
              ...row,
              [columnId]: value,
              updatedAt: new Date(),
            };
          }
          return row;
        })
      );

      // If this is an updatable field and we have a valid row ID (not a generated one)
      if (isUpdatableField && actualRowId && typeof actualRowId === 'number') {
        try {
          const updatePayload: Record<string, any> = {};
          
          // Handle date fields for LSD sheet
          if (config.id === 'lsd') {
            if (columnId === 'entry_date' || columnId === 'credit_note_date_refund_date' || columnId === 'partner_debit_note_date_refund_date') {
              // Handle date fields - convert Date to YYYY-MM-DD format or keep as is
              if (value instanceof Date) {
                updatePayload[columnId] = value.toISOString().split('T')[0];
              } else if (value) {
                updatePayload[columnId] = value;
              } else {
                updatePayload[columnId] = null;
              }
            } else {
              updatePayload[columnId] = value;
            }
          } 
          // Handle closure_datetime for escalation sheet
          else if (columnId === 'closure_datetime') {
            updatePayload.closure_datetime = value;
          } else {
            updatePayload[columnId] = value;
          }

          // Handle manual_ticket_status changes - backend will set is_closed accordingly
          // But we can also update it locally for immediate feedback
          if (columnId === 'manual_ticket_status') {
            const statusLower = String(value).toLowerCase();
            if (statusLower === 'close') {
              updatePayload.is_closed = 1;
              // Update local state immediately
              setData((prev) =>
                prev.map((row) => {
                  if (String(row.id) === rowIdString) {
                    return {
                      ...row,
                      is_closed: 1,
                    };
                  }
                  return row;
                })
              );
            } else if (statusLower === 'open') {
              updatePayload.is_closed = 0;
              // Update local state immediately
              setData((prev) =>
                prev.map((row) => {
                  if (String(row.id) === rowIdString) {
                    return {
                      ...row,
                      is_closed: 0,
                    };
                  }
                  return row;
                })
              );
            }
          }

          // Add vamashipper to the update payload for escalation sheet
          if (config.id === 'escalations' && currentRow?.vamashipper) {
            updatePayload.vamashipper = currentRow.vamashipper;
          }

          // Call the update-entries API based on sheet type
          if (config.id === 'lsd') {
            await sheetApiService.updateLSDEntries(actualRowId, updatePayload);
            // Auto-refresh the sheet after successful LSD update only for manual_case
            if (columnId === 'manual_case') {
              await queryClient.invalidateQueries({ queryKey: ['sheet', 'lsd'] });
              if (refetch) {
                await refetch();
              }
            }
          } else if (config.id === 'escalations') {
            await sheetApiService.updateEscalationEntries(actualRowId, updatePayload);
          }
          
          // Show success message with row identifier
          const columnLabel = config.columns.find((col) => col.id === columnId)?.label || columnId;
          const rowIdentifier = currentRow?.shipment_no 
            ? `shipment_no: ${currentRow.shipment_no}` 
            : `row ID: ${actualRowId}`;
          toast.success(`Updated ${columnLabel} for ${rowIdentifier}`, { 
            id: `update-${actualRowId}-${columnId}` 
          });
          
          // Sequential flow for LSD sheet: manual_case -> credit_note_refund -> remarks
          if (config.id === 'lsd' && actualRowId) {
            if (columnId === 'manual_case') {
              // After manual_case is saved, auto-focus on credit_note_refund
              setTimeout(() => {
                const creditNoteRefundColumn = config.columns.find((col) => col.id === 'credit_note_refund');
                if (creditNoteRefundColumn) {
                  setEditingCell({ rowId: String(actualRowId), columnId: 'credit_note_refund' });
                }
              }, 100);
            } else if (columnId === 'credit_note_refund') {
              // After credit_note_refund is saved, auto-focus on remarks
              setTimeout(() => {
                const remarksColumn = config.columns.find((col) => col.id === 'remarks');
                if (remarksColumn) {
                  setEditingCell({ rowId: String(actualRowId), columnId: 'remarks' });
                }
              }, 100);
            }
          }
        } catch (error: any) {
          // Extract error message from ApiError object or Error instance
          const errorMessage = error?.message || error?.error || 'Failed to update field';
          toast.error(errorMessage);
          
          // Revert the local change on error
          setData((prev) =>
            prev.map((row) => {
              if (String(row.id) === rowIdString) {
                const revertedRow: any = {
                  ...row,
                  [columnId]: currentRow?.[columnId], // Revert to previous value
                };
                
                // If we changed manual_ticket_status, also revert is_closed
                if (columnId === 'manual_ticket_status' && currentRow) {
                  revertedRow.is_closed = currentRow.is_closed;
                }
                
                return revertedRow;
              }
              return row;
            })
          );
        }
      }
    }
  };

  const handleAddRow = () => {
    // Don't allow adding rows in the "Closed Escalations" view
    if (config.id === 'escalations' && activeViewId === 'closed') {
      return;
    }

    const newRowId = `row-${Date.now()}-${++rowIdCounterRef.current}`;
    const newRow: any = {
      id: newRowId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    config.columns.forEach((col) => {
      newRow[col.id] = col.defaultValue || null;
    });

    // Set is_closed to 0 (open) by default for escalation sheet
    // This ensures new rows are visible in the "Open Escalations" view
    if (config.id === 'escalations') {
      newRow.is_closed = 0;
    }

    setData((prev) => [...prev, newRow]); // Add at bottom
    
    toast.success('New row added', { id: 'add-row' });
    
    // Focus on the first cell of the newly created row
    setTimeout(() => {
      const firstColumn = config.columns[0];
      if (firstColumn) {
        setEditingCell({ rowId: newRowId, columnId: firstColumn.id });
      }
    }, 0);
  };

  const handleDeleteRows = async () => {
    const deletedCount = selectedRows.size;
    const deletedRows = data.filter((row) => selectedRows.has(row.id));
    
    if (deletedCount === 0) return;
    
    // Filter rows that have shipment_no (existing rows from backend)
    const rowsToDelete = deletedRows.filter((row) => {
      const isExistingRow = typeof row.id === 'number' || (typeof row.id === 'string' && !row.id.startsWith('row-') && !row.id.startsWith('empty-'));
      return isExistingRow && row.shipment_no;
    });
    
    // Filter new rows (that don't need backend deletion)
    const newRowsToDelete = deletedRows.filter((row) => {
      const isExistingRow = typeof row.id === 'number' || (typeof row.id === 'string' && !row.id.startsWith('row-') && !row.id.startsWith('empty-'));
      return !isExistingRow || !row.shipment_no;
    });
    
    // Delete from backend if escalation or LSD sheet and rows have id
    if ((config.id === 'escalations' || config.id === 'lsd') && rowsToDelete.length > 0) {
      toast.loading(`Deleting ${rowsToDelete.length} row${rowsToDelete.length > 1 ? 's' : ''}...`, { id: 'delete-rows' });
      
      try {
        // Delete all rows in parallel
        await Promise.all(
          rowsToDelete
            .filter((row) => row.id) // Only delete rows that have an id
            .map((row) => {
              if (config.id === 'lsd') {
                return sheetApiService.deleteLSD(row.id, row.vamashipper || '');
              } else {
                return sheetApiService.deleteEscalation(row.id, row.shipment_no, row.vamashipper);
              }
            })
        );
        
        // Only remove successfully deleted rows from UI
        const deletedRowIds = new Set(rowsToDelete.map((row) => String(row.id)));
        setData((prev) => prev.filter((row) => !deletedRowIds.has(String(row.id)) && !selectedRows.has(row.id)));
        clearSelection();
        
        const shipmentNos = rowsToDelete
          .map((row) => row.shipment_no)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        const moreText = rowsToDelete.length > 3 ? ` and ${rowsToDelete.length - 3} more` : '';
        toast.success(`Deleted ${rowsToDelete.length} row${rowsToDelete.length > 1 ? 's' : ''}${shipmentNos ? ` (${shipmentNos}${moreText})` : ''}`, {
          id: 'delete-rows'
        });
      } catch (error: any) {
        // Extract error message from ApiError object or Error instance
        const errorMessage = error?.message || error?.error || 'Failed to delete rows. Please refresh and try again.';
        toast.error(errorMessage, {
          id: 'delete-rows'
        });
        // Rows stay visible - no need to restore them since we never removed them
        clearSelection();
      }
    }
    
    // Remove new rows optimistically (they don't need backend deletion)
    if (newRowsToDelete.length > 0) {
      const newRowIds = new Set(newRowsToDelete.map((row) => String(row.id)));
      setData((prev) => prev.filter((row) => !newRowIds.has(String(row.id))));
      clearSelection();
      
      const shipmentNos = newRowsToDelete
        .map((row) => row.shipment_no)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      const moreText = newRowsToDelete.length > 3 ? ` and ${newRowsToDelete.length - 3} more` : '';
      toast.success(`Deleted ${newRowsToDelete.length} row${newRowsToDelete.length > 1 ? 's' : ''}${shipmentNos ? ` (${shipmentNos}${moreText})` : ''}`, {
        id: 'delete-rows'
      });
    }
  };

  const handleDuplicateRow = (rowId: string) => {
    const rowIdString = String(rowId);
    const rowToDuplicate = data.find((row) => String(row.id) === rowIdString);
    if (!rowToDuplicate) return;

    const newRow: any = {
      ...rowToDuplicate,
      id: `row-${Date.now()}-${++rowIdCounterRef.current}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    // Insert after the duplicated row
    const index = data.findIndex((row) => String(row.id) === rowIdString);
    setData((prev) => [
      ...prev.slice(0, index + 1),
      newRow,
      ...prev.slice(index + 1),
    ]);
    
    const rowIdentifier = rowToDuplicate.shipment_no 
      ? `shipment_no: ${rowToDuplicate.shipment_no}` 
      : `row ID: ${rowIdString}`;
    toast.success(`Duplicated row (${rowIdentifier})`, { id: `duplicate-${rowIdString}` });
  };

  const handleDuplicateRows = (rowIds: string[]) => {
    const newRows: any[] = [];
    
    rowIds.forEach((rowId) => {
      const rowIdString = String(rowId);
      const rowToDuplicate = data.find((row) => String(row.id) === rowIdString);
      if (!rowToDuplicate) return;

      const newRow: any = {
        ...rowToDuplicate,
        id: `row-${Date.now()}-${++rowIdCounterRef.current}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };
      newRows.push(newRow);
    });

    if (newRows.length === 0) return;

    // Add all duplicated rows at the end
    setData((prev) => [...prev, ...newRows]);
    
    toast.success(`Duplicated ${newRows.length} rows`, { id: 'duplicate-bulk' });
  };

  const handleCopyRow = (rowId: string) => {
    const rowIdString = String(rowId);
    const rowToCopy = data.find((row) => String(row.id) === rowIdString);
    if (!rowToCopy) return;

    // Create a copy of the row data (excluding metadata)
    const rowData: any = {};
    config.columns.forEach((col) => {
      rowData[col.label] = rowToCopy[col.id];
    });

    // Copy as tab-separated values (compatible with spreadsheets)
    const textData = config.columns
      .map((col) => {
        const value = rowToCopy[col.id];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        return String(value);
      })
      .join('\t');

    // Copy as JSON for programmatic use
    const jsonData = JSON.stringify(rowData, null, 2);

    // Try to copy both formats
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': new Blob([textData], { type: 'text/plain' }),
        'application/json': new Blob([jsonData], { type: 'application/json' }),
      });
      navigator.clipboard.write([item]).catch(() => {
        // Fallback to text only
        navigator.clipboard.writeText(textData);
      });
    } else {
      // Fallback for older browsers
      navigator.clipboard.writeText(textData);
    }
    
    const rowIdentifier = rowToCopy.shipment_no 
      ? `shipment_no: ${rowToCopy.shipment_no}` 
      : `row ID: ${rowIdString}`;
    toast.success(`Copied row data (${rowIdentifier}) to clipboard`, { id: `copy-${rowIdString}` });
  };

  const handleCopyRows = (rowIds: string[]) => {
    const rowsToCopy = rowIds
      .map((rowId) => data.find((row) => String(row.id) === String(rowId)))
      .filter(Boolean) as RowData[];

    if (rowsToCopy.length === 0) return;

    // Create header row
    const headers = config.columns.map((col) => col.label).join('\t');

    // Create data rows as tab-separated values (compatible with spreadsheets)
    const textRows = rowsToCopy.map((row) =>
      config.columns
        .map((col) => {
          const value = row[col.id];
          if (value === null || value === undefined) return '';
          if (value instanceof Date) return value.toISOString();
          return String(value);
        })
        .join('\t')
    );

    const textData = [headers, ...textRows].join('\n');

    // Copy as JSON for programmatic use
    const jsonData = JSON.stringify(
      rowsToCopy.map((row) => {
        const rowData: any = {};
        config.columns.forEach((col) => {
          rowData[col.label] = row[col.id];
        });
        return rowData;
      }),
      null,
      2
    );

    // Try to copy both formats
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': new Blob([textData], { type: 'text/plain' }),
        'application/json': new Blob([jsonData], { type: 'application/json' }),
      });
      navigator.clipboard.write([item]).catch(() => {
        // Fallback to text only
        navigator.clipboard.writeText(textData);
      });
    } else {
      // Fallback for older browsers
      navigator.clipboard.writeText(textData);
    }

    toast.success(`Copied ${rowsToCopy.length} rows to clipboard`, { id: 'copy-bulk' });
  };

  const handleDeleteRow = async (rowId: string) => {
    const rowIdString = String(rowId);
    const rowToDelete = data.find((row) => String(row.id) === rowIdString);
    
    if (!rowToDelete) return;
    
    const isExistingRow = typeof rowToDelete.id === 'number' || (typeof rowToDelete.id === 'string' && !rowToDelete.id.startsWith('row-') && !rowToDelete.id.startsWith('empty-'));
    const hasShipmentNo = rowToDelete.shipment_no;
    
    // Delete from backend if escalation or LSD sheet and row has id
    if ((config.id === 'escalations' || config.id === 'lsd') && isExistingRow && rowToDelete.id) {
      toast.loading('Deleting row...', { id: `delete-${rowIdString}` });
      
      try {
        if (config.id === 'lsd') {
          await sheetApiService.deleteLSD(rowToDelete.id, rowToDelete.vamashipper || '');
        } else {
          await sheetApiService.deleteEscalation(rowToDelete.id, rowToDelete.shipment_no, rowToDelete.vamashipper);
        }
        // Only remove from UI after successful deletion
        setData((prev) => prev.filter((row) => String(row.id) !== rowIdString));
        const rowIdentifier = rowToDelete.shipment_no 
          ? `shipment_no: ${rowToDelete.shipment_no}` 
          : `row ID: ${rowIdString}`;
        toast.success(`Deleted row (${rowIdentifier})`, { 
          id: `delete-${rowIdString}` 
        });
      } catch (error: any) {
        // Extract error message from ApiError object or Error instance
        const errorMessage = error?.message || error?.error || 'Failed to delete row. Please refresh and try again.';
        toast.error(errorMessage, {
          id: `delete-${rowIdString}`
        });
        // Row stays visible - no need to restore it since we never removed it
      }
    } else {
      // For new rows or non-escalation/LSD sheets, optimistically remove from UI
      setData((prev) => prev.filter((row) => String(row.id) !== rowIdString));
      const rowIdentifier = rowToDelete.shipment_no 
        ? `shipment_no: ${rowToDelete.shipment_no}` 
        : `row ID: ${rowIdString}`;
      toast.success(`Deleted row (${rowIdentifier})`, { id: `delete-${rowIdString}` });
    }
  };

  const handleDeleteRowsBulk = async (rowIds: string[]) => {
    const rowsToProcess = rowIds
      .map((rowId) => data.find((row) => String(row.id) === String(rowId)))
      .filter(Boolean) as RowData[];

    if (rowsToProcess.length === 0) return;

    // Filter rows that have shipment_no (existing rows from backend)
    const rowsToDelete = rowsToProcess.filter((row) => {
      const isExistingRow = typeof row.id === 'number' || (typeof row.id === 'string' && !row.id.startsWith('row-') && !row.id.startsWith('empty-'));
      return isExistingRow && row.shipment_no;
    });

    // Filter new rows (that don't need backend deletion)
    const newRowsToDelete = rowsToProcess.filter((row) => {
      const isExistingRow = typeof row.id === 'number' || (typeof row.id === 'string' && !row.id.startsWith('row-') && !row.id.startsWith('empty-'));
      return !isExistingRow || !row.shipment_no;
    });

    // Delete from backend if escalation or LSD sheet and rows have id
    if ((config.id === 'escalations' || config.id === 'lsd') && rowsToDelete.length > 0) {
      toast.loading(`Deleting ${rowsToDelete.length} row${rowsToDelete.length > 1 ? 's' : ''}...`, { id: 'delete-rows-bulk' });

      try {
        // Delete all rows in parallel
        await Promise.all(
          rowsToDelete
            .filter((row) => row.id)
            .map((row) => {
              if (config.id === 'lsd') {
                return sheetApiService.deleteLSD(row.id, row.vamashipper || '');
              } else {
                return sheetApiService.deleteEscalation(row.id, row.shipment_no, row.vamashipper);
              }
            })
        );

        // Only remove successfully deleted rows from UI
        const deletedRowIds = new Set(rowsToDelete.map((row) => String(row.id)));
        setData((prev) => prev.filter((row) => !deletedRowIds.has(String(row.id))));
        clearSelection();

        const shipmentNos = rowsToDelete
          .map((row) => row.shipment_no)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        const moreText = rowsToDelete.length > 3 ? ` and ${rowsToDelete.length - 3} more` : '';
        toast.success(`Deleted ${rowsToDelete.length} row${rowsToDelete.length > 1 ? 's' : ''}${shipmentNos ? ` (${shipmentNos}${moreText})` : ''}`, {
          id: 'delete-rows-bulk'
        });
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || 'Failed to delete rows. Please refresh and try again.';
        toast.error(errorMessage, { id: 'delete-rows-bulk' });
        clearSelection();
      }
    }

    // Remove new rows optimistically (they don't need backend deletion)
    if (newRowsToDelete.length > 0) {
      const newRowIds = new Set(newRowsToDelete.map((row) => String(row.id)));
      setData((prev) => prev.filter((row) => !newRowIds.has(String(row.id))));
      clearSelection();

      if (rowsToDelete.length === 0) {
        // Only show this toast if we didn't already show one for backend deletion
        toast.success(`Deleted ${newRowsToDelete.length} row${newRowsToDelete.length > 1 ? 's' : ''}`, {
          id: 'delete-rows-bulk'
        });
      }
    }
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
  };

  const handleRefresh = async () => {
    // Save current scroll position
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    
    // Show loading toast
    const sheetDisplayName = config.id === 'escalations' ? 'escalation' : config.id === 'lsd' ? 'LSD' : 'sheet';
    toast.loading(`Refreshing ${sheetDisplayName} sheet...`, { id: 'refresh' });
    
    // Invalidate query cache to force fresh fetch
    const sheetName = config.id === 'escalations' ? 'escalation' : config.id;
    await queryClient.invalidateQueries({ queryKey: ['sheet', sheetName] });
    
    // Refresh the data
    if (refetch) {
      try {
        await refetch();
        toast.success(`${sheetDisplayName.charAt(0).toUpperCase() + sheetDisplayName.slice(1)} sheet refreshed successfully`, { id: 'refresh' });
      } catch (error: any) {
        toast.error(`Failed to refresh ${sheetDisplayName} sheet`, { id: 'refresh' });
      }
    }
    
    // Restore scroll position after data is loaded and DOM is updated
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollTop;
        }
      }, 50);
    });
  };

  // Undo handler - restore previous value
  const handleUndo = () => {
    const entry = undoFromStore();
    if (!entry) {
      toast.info('Nothing to undo');
      return;
    }
    
    // Update the cell with the old value (without pushing to history)
    setData((prev) =>
      prev.map((row) => {
        if (String(row.id) === String(entry.rowId)) {
          return {
            ...row,
            [entry.columnId]: entry.oldValue,
            updatedAt: new Date(),
          };
        }
        return row;
      })
    );
    
    const columnLabel = config.columns.find((col) => col.id === entry.columnId)?.label || entry.columnId;
    toast.success(`Undo: Restored ${columnLabel}`, { duration: 2000 });
  };

  // Redo handler - reapply the change
  const handleRedo = () => {
    const entry = redoFromStore();
    if (!entry) {
      toast.info('Nothing to redo');
      return;
    }
    
    // Update the cell with the new value (without pushing to history)
    setData((prev) =>
      prev.map((row) => {
        if (String(row.id) === String(entry.rowId)) {
          return {
            ...row,
            [entry.columnId]: entry.newValue,
            updatedAt: new Date(),
          };
        }
        return row;
      })
    );
    
    const columnLabel = config.columns.find((col) => col.id === entry.columnId)?.label || entry.columnId;
    toast.success(`Redo: Restored ${columnLabel}`, { duration: 2000 });
  };

  const processBulkUploadFile = async (file: File) => {
    try {
      toast.loading('Reading Excel file...', { id: 'bulk-upload' });

      // Read the file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse the Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Use array format to preserve column order
        defval: null // Use null for empty cells
      }) as any[][];

      if (jsonData.length < 2) {
        toast.error('Excel file must have at least a header row and one data row', { id: 'bulk-upload' });
        throw new Error('Invalid file format');
      }

      // Get headers from first row
      const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase().trim());
      
      // Find column indices
      const shipmentNoIndex = headers.findIndex((h: string) => 
        h === 'shipment_no' || h === 'shipment no' || h === 'shipmentno'
      );
      const manualCaseIndex = headers.findIndex((h: string) => 
        h === 'manual_case' || h === 'manual case' || h === 'manualcase'
      );
      const notesIndex = headers.findIndex((h: string) => 
        h === 'notes' || h === 'Notes'
      );
      const sourceOfComplaintIndex = headers.findIndex((h: string) => 
        h === 'source_of_complaint' || h === 'source of complaint' || h === 'Source of Complaint'
      )

      if (shipmentNoIndex === -1) {
        toast.error('Excel file must have a "shipment_no" column', { id: 'bulk-upload' });
        throw new Error('Missing shipment_no column');
      }

      // Convert rows to the required format
      const uploadData: Array<{
        shipment_no: string | number;
        manual_case?: string | null;
        notes?: string | null;
        source_of_complaint?: string | null;
      }> = [];

      // Process data rows (skip header row)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const shipmentNo = row[shipmentNoIndex];
        
        // Skip empty rows
        if (!shipmentNo) continue;

        const record: any = {
          shipment_no: shipmentNo,
        };

        if (manualCaseIndex !== -1 && row[manualCaseIndex]) {
          record.manual_case = String(row[manualCaseIndex]).trim() || null;
        }

        if (notesIndex !== -1 && row[notesIndex]) {
          record.notes = String(row[notesIndex]).trim() || null;
        }

        if (sourceOfComplaintIndex !== -1 && row[sourceOfComplaintIndex]) {
          record.source_of_complaint = String(row[sourceOfComplaintIndex]).trim() || null;
        }

        uploadData.push(record);
      }

      if (uploadData.length === 0) {
        toast.error('No valid data rows found in Excel file', { id: 'bulk-upload' });
        throw new Error('No valid data');
      }

      toast.loading(`Uploading ${uploadData.length} records...`, { id: 'bulk-upload' });

      // Call the bulk upload API
      await sheetApiService.bulkUploadEscalations(uploadData);

      toast.success(`Successfully uploaded ${uploadData.length} records!`, { id: 'bulk-upload' });

      // Refresh the data after successful upload
      if (refetch) {
        await refetch();
      }

    } catch (error: any) {
      console.error('Bulk upload error:', error);
      if (!error.message || error.message === 'Invalid file format' || error.message === 'Missing shipment_no column' || error.message === 'No valid data') {
        // Error already shown in toast
        throw error;
      }
      toast.error(error.message || 'Failed to upload Excel file', { id: 'bulk-upload' });
      throw error;
    }
  };

  // Initialize column visibility (empty on server, loaded on client)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // Load column visibility from localStorage after mount (client-side only)
  useEffect(() => {
    const visibility = loadColumnVisibility(config.id);
    setColumnVisibility(visibility);
  }, [config.id]);

  // Save column visibility when it changes
  const handleColumnVisibilityChange = (visibility: Record<string, boolean>) => {
    setColumnVisibility(visibility);
    saveColumnVisibility(config.id, visibility);
  };

  const handleClearFilters = () => {
    clearAllFilters();
  };

  const handleViewChange = (viewId: string) => {
    const selectedView = views.find((v) => v.id === viewId);
    if (selectedView) {
      applyView(selectedView);
    }
  };

  // View management handlers
  const handleCreateView = () => {
    setEditingView(null);
    setViewDialogMode('create');
    setShowViewDialog(true);
  };

  const handleEditView = (view: UserView) => {
    setEditingView(view);
    setViewDialogMode('edit');
    setShowViewDialog(true);
  };

  const handleDuplicateView = (viewId: string) => {
    const duplicated = storeDuplicateView(viewId);
    if (duplicated) {
      toast.success(`View "${duplicated.name}" created`);
    }
  };

  const handleDeleteView = (viewId: string) => {
    const viewToDelete = views.find(v => v.id === viewId);
    if (viewToDelete?.isSystem) {
      toast.error('Cannot delete system views');
      return;
    }
    storeDeleteView(viewId);
    toast.success('View deleted');
  };

  const handleSetDefaultView = (viewId: string) => {
    setDefaultViewId(viewId);
    const view = views.find(v => v.id === viewId);
    toast.success(`"${view?.name}" set as default view`);
  };

  const handleSaveView = (data: { 
    name: string; 
    description?: string;
    saveFilters: boolean;
    saveColumnLayout: boolean;
    saveSorting: boolean;
  }) => {
    if (viewDialogMode === 'edit' && editingView) {
      // Update existing view
      updateView(editingView.id, {
        name: data.name,
        description: data.description,
      });
      toast.success(`View "${data.name}" updated`);
    } else {
      // Create new view
      const currentState = getCurrentViewState();
      
      const newView = addView({
        name: data.name,
        description: data.description,
        isSystem: false,
        isDefault: false,
        icon: 'LayoutGrid',
        color: '#6366f1',
        filters: data.saveFilters ? currentState.filters : [],
        hiddenColumns: data.saveColumnLayout ? currentState.hiddenColumns : [],
        pinnedColumns: data.saveColumnLayout ? currentState.pinnedColumns : [],
        columnOrder: data.saveColumnLayout ? currentState.columnOrder : [],
        sorts: data.saveSorting ? currentState.sorts : [],
        groupByColumn: data.saveSorting ? currentState.groupByColumn : null,
      });
      
      toast.success(`View "${data.name}" created`);
      
      // Switch to the new view
      applyView(newView);
    }
    
    setShowViewDialog(false);
    setEditingView(null);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setShowCommandPalette(true),
    onNewRow: handleAddRow,
    onSearch: () => setShowCommandPalette(true), // Open command palette for search
    onEscape: () => {
      // Cancel editing cell or close command palette
      setEditingCell(null);
      setShowCommandPalette(false);
    },
    onDelete: () => {
      if (selectedRows.size > 0) {
        handleDeleteRows();
      }
    },
  });

  return (
    <div className="flex h-full">
      {/* Sidebar - only show if views exist */}
      {views.length > 0 && (
        <ViewsSidebar
          views={views}
          activeViewId={activeViewId || ''}
          defaultViewId={defaultViewId}
          onViewChange={handleViewChange}
          onCreateView={handleCreateView}
          onEditView={handleEditView}
          onDuplicateView={handleDuplicateView}
          onDeleteView={handleDeleteView}
          onSetDefaultView={handleSetDefaultView}
        />
      )}

      {/* View Create/Edit Dialog */}
      <ViewCreateDialog
        isOpen={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setEditingView(null);
        }}
        onSave={handleSaveView}
        editingView={editingView}
        mode={viewDialogMode}
      />

      {/* Main Content Area */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <Toolbar
          ref={toolbarRef}
          config={config}
          data={filteredData}
          userRole={userRole}
          onAddRow={handleAddRow}
          onDeleteRows={handleDeleteRows}
          onBulkUpload={handleBulkUpload}
          onRefresh={handleRefresh}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          {...({
            globalSearch,
            onGlobalSearchChange: setGlobalSearch,
            visibleRowCount,
            activeViewId,
          } as any)}
        />
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onAddRow={handleAddRow}
          onDeleteRows={handleDeleteRows}
          onOpenFilter={() => {}}
        />
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          onUpload={processBulkUploadFile}
        />
        
        <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
          {/* Show hero section for portfolio sheet */}
          {config.id === 'portfolio' && data.length === 0 && !isLoading && (
            <div className="h-full overflow-auto">
              <HeroSection />
            </div>
          )}
          
          {/* Show data grid */}
          <div className={`${config.id === 'portfolio' && data.length === 0 ? 'hidden' : 'h-full'} p-1 sm:p-2`}>
            {isLoading ? (
              <TableSkeleton rows={15} columns={config.columns.length} />
            ) : (
              <DataGrid
                config={config}
                data={filteredData}
                userRole={userRole}
                onCellUpdate={handleCellUpdate}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={handleColumnVisibilityChange}
                onDuplicateRow={handleDuplicateRow}
                onDuplicateRows={handleDuplicateRows}
                onCopyRow={handleCopyRow}
                onCopyRows={handleCopyRows}
                onDeleteRow={handleDeleteRow}
                onDeleteRows={handleDeleteRowsBulk}
                onAddRow={handleAddRow}
                onClearFilters={handleClearFilters}
                hasActiveFilters={Object.keys(viewState.columnFilters).length > 0}
                scrollContainerRef={scrollContainerRef}
                globalSearch={globalSearch}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
