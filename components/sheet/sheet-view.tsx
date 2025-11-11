'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { SheetConfig, RowData, UserRole, ColumnFilter } from '@/types';
import { DataGrid } from './data-grid';
import { Toolbar, ToolbarRef } from './toolbar';
import { CommandPalette } from './command-palette';
import { TableSkeleton } from './table-skeleton';
import { ViewsSidebar } from './views-sidebar';
import { HeroSection } from './hero-section';
import { BulkUploadModal } from './bulk-upload-modal';
import { useSheetStore } from '@/lib/store/sheet-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { loadColumnVisibility, saveColumnVisibility } from '@/lib/utils/storage';
import { useSheetData } from '@/hooks/use-sheet-data';
import { toast } from 'sonner';
import { sheetApiService } from '@/lib/api/sheets';
import * as XLSX from 'xlsx';

interface SheetViewProps {
  config: SheetConfig;
  userRole: UserRole;
}

export function SheetView({ config, userRole }: SheetViewProps) {
  const [data, setData] = useState<RowData[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const { 
    viewState, 
    selectedRows, 
    clearSelection, 
    setEditingCell, 
    clearAllFilters,
    setColumnFilter,
    loadViewStateForSheet,
    loadColumnWidthsForSheet,
    setActiveSheetId
  } = useSheetStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const toolbarRef = useRef<ToolbarRef>(null);
  const hasAppliedDefaultFilters = useRef(false);

  // Fetch sheet data from API based on sheet ID
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
    }
  );

  // View management
  const defaultView = config.views?.find((v) => v.isDefault) || config.views?.[0];
  const [activeViewId, setActiveViewId] = useState<string | undefined>(defaultView?.id);
  const activeView = config.views?.find((v) => v.id === activeViewId);

  // Load persisted state when component mounts or config changes
  useEffect(() => {
    setActiveSheetId(config.id);
    loadViewStateForSheet(config.id);
    loadColumnWidthsForSheet(config.id);
    // Reset the flag when sheet changes
    hasAppliedDefaultFilters.current = false;
  }, [config.id, setActiveSheetId, loadViewStateForSheet, loadColumnWidthsForSheet]);

  // Apply default view filters if no filters are already set (after state loads)
  useEffect(() => {
    // Only apply default filters once on initial mount
    if (hasAppliedDefaultFilters.current) return;
    
    const defaultView = config.views?.find((v) => v.isDefault) || config.views?.[0];
    if (defaultView?.filters && Object.keys(viewState.columnFilters).length === 0) {
      hasAppliedDefaultFilters.current = true;
      const columnFilters: Record<string, ColumnFilter> = {};
      defaultView.filters.forEach((filter) => {
        columnFilters[filter.columnId] = {
          type: 'condition',
          condition: {
            operator: filter.operator,
            value: filter.value,
          },
        };
      });
      
      // Apply the filters
      Object.entries(columnFilters).forEach(([columnId, filter]) => {
        setColumnFilter(columnId, filter);
      });
    }
  }, [config.views, viewState.columnFilters, setColumnFilter]);

  // Update data when API data changes
  useEffect(() => {
    if (apiData) {
      setData(apiData);
      setLocalError(null);
    }
  }, [apiData]);

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

    // Apply column filters
    if (Object.keys(viewState.columnFilters).length > 0) {
      const { applyFilters } = require('@/lib/utils/filter-data');
      result = applyFilters(result, viewState.columnFilters, config.columns);
    }

    // Add 50 empty editable rows at the bottom (virtual scrolling handles rendering)
    const emptyRows = Array.from({ length: 50 }, (_, i) => {
      const emptyRow: any = {
        id: `empty-${i}`,
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
    });

    return [...result, ...emptyRows];
  }, [data, viewState.columnFilters, config.columns]);

  const handleCellUpdate = async (rowId: string, columnId: string, value: any) => {
    // Check if this is the shipment_no column for escalation sheet
    const isShipmentNoUpdate = columnId === 'shipment_no' && config.id === 'escalations' && value;

    // Convert rowId to string to handle cases where it might be a number from API
    const rowIdString = String(rowId);

    // Fields that should trigger the update-entries API call
    const updatableFields = [
      'notes',
      'manual_case',
      'followup_remarks',
      'source_of_complaint',
      'manual_ticket_status',
      'email_subject',
      'lr_number',
      'closure_datetime', // Also handle closure_datetime
    ];

    // Check if this is an updatable field for escalation sheet
    const isUpdatableField = config.id === 'escalations' && updatableFields.includes(columnId);

    // Check if this is an empty row being edited
    if (rowIdString.startsWith('empty-')) {
      // Convert empty row to real row
      const newRow: any = {
        id: `row-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      config.columns.forEach((col) => {
        newRow[col.id] = col.id === columnId ? value : col.defaultValue || null;
      });

      setData((prev) => [...prev, newRow]);

      // If shipment number was entered in empty row, fetch details from backend
      if (isShipmentNoUpdate) {
        try {
          toast.loading('Fetching escalation details...', { id: 'fetch-escalation' });
          const response = await sheetApiService.updateEscalationSheet(String(value));
          
          if (response.data?.escalation) {
            // Update the newly created row with data from backend
            setData((prev) =>
              prev.map((row) => {
                if (String(row.id) === String(newRow.id)) {
                  return {
                    ...row,
                    ...response.data.escalation,
                    id: row.id, // Keep the generated ID
                    updatedAt: new Date(),
                  };
                }
                return row;
              })
            );
            toast.success('Escalation details loaded successfully', { id: 'fetch-escalation' });
          }
        } catch (error: any) {
          console.error('Failed to fetch escalation details:', error);
          toast.error(error.message || 'Failed to fetch escalation details', { id: 'fetch-escalation' });
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
          
          // Handle closure_datetime separately - convert Date to ISO string or null
          if (columnId === 'closure_datetime') {
            // updatePayload.closure_datetime = value ? (value instanceof Date ? value.toISOString() : value) : null;
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

          // Call the update-entries API
          await sheetApiService.updateEscalationEntries(actualRowId, updatePayload);
          // Success is handled silently - the UI is already updated
        } catch (error: any) {
          console.error('Failed to update escalation entry:', error);
          toast.error(error.message || 'Failed to update field');
          
          // Revert the local change on error
          setData((prev) =>
            prev.map((row) => {
              if (String(row.id) === rowIdString) {
                return {
                  ...row,
                  [columnId]: currentRow?.[columnId], // Revert to previous value
                };
              }
              return row;
            })
          );
        }
      }

      // If shipment number was updated, fetch details from backend
      if (isShipmentNoUpdate) {
        try {
          toast.loading('Fetching escalation details...', { id: 'fetch-escalation' });
          const response = await sheetApiService.updateEscalationSheet(String(value));
          
          if (response.data?.escalation) {
            // Update the row with data from backend
            setData((prev) =>
              prev.map((row) => {
                if (String(row.id) === rowIdString) {
                  return {
                    ...row,
                    ...response.data.escalation,
                    id: rowId, // Keep the existing ID
                    updatedAt: new Date(),
                  };
                }
                return row;
              })
            );
            toast.success('Escalation details loaded successfully', { id: 'fetch-escalation' });
          }
        } catch (error: any) {
          console.error('Failed to fetch escalation details:', error);
          toast.error(error.message || 'Failed to fetch escalation details', { id: 'fetch-escalation' });
        }
      }
    }
  };

  const handleAddRow = () => {
    const newRowId = `row-${Date.now()}`;
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
    
    // Focus on the first cell of the newly created row
    setTimeout(() => {
      const firstColumn = config.columns[0];
      if (firstColumn) {
        setEditingCell({ rowId: newRowId, columnId: firstColumn.id });
      }
    }, 0);
  };

  const handleDeleteRows = () => {
    setData((prev) => prev.filter((row) => !selectedRows.has(row.id)));
    clearSelection();
  };

  const handleDuplicateRow = (rowId: string) => {
    const rowIdString = String(rowId);
    const rowToDuplicate = data.find((row) => String(row.id) === rowIdString);
    if (!rowToDuplicate) return;

    const newRow: any = {
      ...rowToDuplicate,
      id: `row-${Date.now()}`,
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
  };

  const handleDeleteRow = (rowId: string) => {
    const rowIdString = String(rowId);
    setData((prev) => prev.filter((row) => String(row.id) !== rowIdString));
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
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
      const followupRemarksIndex = headers.findIndex((h: string) => 
        h === 'followup_remarks' || h === 'followup remarks' || h === 'followupremarks'
      );

      if (shipmentNoIndex === -1) {
        toast.error('Excel file must have a "shipment_no" column', { id: 'bulk-upload' });
        throw new Error('Missing shipment_no column');
      }

      // Convert rows to the required format
      const uploadData: Array<{
        shipment_no: string | number;
        manual_case?: string | null;
        followup_remarks?: string | null;
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

        if (followupRemarksIndex !== -1 && row[followupRemarksIndex]) {
          record.followup_remarks = String(row[followupRemarksIndex]).trim() || null;
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
    setActiveViewId(viewId);
    
    // Apply view filters when switching views
    const selectedView = config.views?.find((v) => v.id === viewId);
    if (selectedView?.filters) {
      // Convert view filters to column filters format
      const columnFilters: Record<string, ColumnFilter> = {};
      selectedView.filters.forEach((filter) => {
        columnFilters[filter.columnId] = {
          type: 'condition',
          condition: {
            operator: filter.operator,
            value: filter.value,
          },
        };
      });
      
      // Apply the filters
      Object.entries(columnFilters).forEach(([columnId, filter]) => {
        setColumnFilter(columnId, filter);
      });
    } else {
      // Clear filters if view has no filters
      clearAllFilters();
    }
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
      {/* Sidebar - only show if views are defined */}
      {config.views && config.views.length > 0 && (
        <ViewsSidebar
          views={config.views}
          activeViewId={activeViewId || ''}
          onViewChange={handleViewChange}
        />
      )}

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
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
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
                onCopyRow={handleCopyRow}
                onDeleteRow={handleDeleteRow}
                onAddRow={handleAddRow}
                onClearFilters={handleClearFilters}
                hasActiveFilters={Object.keys(viewState.columnFilters).length > 0}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
