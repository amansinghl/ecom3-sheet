'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { SheetConfig, RowData, UserRole, ColumnFilter } from '@/types';
import { DataGrid } from './data-grid';
import { Toolbar, ToolbarRef } from './toolbar';
import { CommandPalette } from './command-palette';
import { TableSkeleton } from './table-skeleton';
import { ViewsSidebar } from './views-sidebar';
import { HeroSection } from './hero-section';
import { useSheetStore } from '@/lib/store/sheet-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { loadColumnVisibility, saveColumnVisibility } from '@/lib/utils/storage';
import { useSheetData } from '@/hooks/use-sheet-data';
import { toast } from 'sonner';
import { sheetApiService } from '@/lib/api/sheets';

interface SheetViewProps {
  config: SheetConfig;
  userRole: UserRole;
}

// Seeded random function for consistent results
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Sample data templates based on real escalation data
const sampleNotes = [
  'please arrange pick up',
  'customer requesting delivery reattempt',
  'package damaged - need replacement',
  'wrong address - update delivery location',
  'urgent delivery required',
  'customer not available - reschedule',
  'delivery delayed - provide update',
  'package lost in transit',
];
const sampleFollowupRemarks = [
  'Called customer - will be available tomorrow',
  'Contacted partner - delivery rescheduled',
  'Customer confirmed address',
  'Pickup arranged for next day',
  'Escalated to senior team',
  'Resolved - delivery completed',
];
const sampleManualCases = ['Fake NDR Remark', 'Delivery Issue', 'Delayed RTO', 'Reverse Pickup', 'Reverse delivery issues', 'Delayed Pickup', 'Re Attempt', 'COD Delay', 'EDD Breach', 'EDD Urgent'];
const samplePartnerNames = ['Bluedart', 'Delhivery', 'DTDC', 'Ecom Express', 'Xpressbees', 'Shadowfax', 'Ekart', 'FedEx', 'DHL'];
const sampleConsigneeNames = ['UNIFY SOLUTIONS', 'TECH CORP', 'RETAIL STORE', 'ENTERPRISES LTD', 'TRADING CO', 'LOGISTICS HUB'];
const sampleVamaShippers = ['Kamal Singh', 'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Mehta'];
const sampleTrackingStatuses = ['Pickup Cancelled', 'In Transit', 'Out for Delivery', 'Delivered', 'RTO Initiated', 'Pending Pickup', 'Failed Delivery', 'Lost', 'On Hold'];
const sampleAutoTicketStatuses = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
const sampleManualTicketStatuses = ['Open', 'Close'];
const sampleSourceOfComplaint = ['Email', 'Phone', 'Chat', 'WhatsApp', 'Portal'];
const sampleLastModifiedBy = ['CS OPS', 'Support Team', 'Logistics Manager', 'Customer Care', 'Operations'];
const sampleSellerNames = ['Vendor A Pvt Ltd', 'Seller B Trading', 'Merchant C Corp', 'Shop D Enterprise', 'Retailer E'];
const samplePartnerRemarks = ['Delivery attempted - customer unavailable', 'Address incorrect', 'Customer refused', 'Rescheduled for next day', 'Package held at facility'];
const samplePartnerCommentNDR = ['Customer not reachable', 'Incorrect address', 'Refused by customer', 'Door locked'];
const sampleEddPartner = ['2024-12-25', '2024-12-26', '2024-12-27', '2024-12-28', '2024-12-29'];

// Mock data generator with seeded random for consistent server/client rendering
function generateMockData(config: SheetConfig, count: number = 100): RowData[] {
  const data: RowData[] = [];
  let seed = 12345; // Fixed seed for consistent results
  const baseDate = new Date('2024-01-01T00:00:00Z').getTime(); // Fixed base date

  for (let i = 1; i <= count; i++) {
    const awbNumber = Math.floor(300000000000 + seededRandom(seed++) * 99999999999);
    const shipmentNo = Math.floor(300000000 + seededRandom(seed++) * 99999999);
    
    const row: any = {
      id: `row-${i}`,
      createdAt: new Date(baseDate + seededRandom(seed++) * 180 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(baseDate + 200 * 24 * 60 * 60 * 1000 + i * 1000 * 60 * 60),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    // Generate values based on column type and specific field names
    config.columns.forEach((col) => {
      switch (col.id) {
        case 'shipment_no':
          row[col.id] = shipmentNo;
          break;
        case 'awb_no':
          row[col.id] = awbNumber.toString();
          break;
        case 'notes':
          row[col.id] = sampleNotes[Math.floor(seededRandom(seed++) * sampleNotes.length)];
          break;
        case 'followup_remarks':
          row[col.id] = seededRandom(seed++) > 0.3 ? sampleFollowupRemarks[Math.floor(seededRandom(seed++) * sampleFollowupRemarks.length)] : '';
          break;
        case 'manual_case':
          row[col.id] = sampleManualCases[Math.floor(seededRandom(seed++) * sampleManualCases.length)];
          break;
        case 'partner_remarks':
          row[col.id] = seededRandom(seed++) > 0.5 ? samplePartnerRemarks[Math.floor(seededRandom(seed++) * samplePartnerRemarks.length)] : '';
          break;
        case 'partner_name':
          row[col.id] = samplePartnerNames[Math.floor(seededRandom(seed++) * samplePartnerNames.length)];
          break;
        case 'consignee_name':
          row[col.id] = sampleConsigneeNames[Math.floor(seededRandom(seed++) * sampleConsigneeNames.length)];
          break;
        case 'vamashipper':
          row[col.id] = sampleVamaShippers[Math.floor(seededRandom(seed++) * sampleVamaShippers.length)];
          break;
        case 'consignee_no':
          row[col.id] = `${Math.floor(7000000000 + seededRandom(seed++) * 2999999999)}`;
          break;
        case 'seller_mobile':
          row[col.id] = `${Math.floor(7000000000 + seededRandom(seed++) * 2999999999)}`;
          break;
        case 'latest_tracking_status':
          row[col.id] = sampleTrackingStatuses[Math.floor(seededRandom(seed++) * sampleTrackingStatuses.length)];
          break;
        case 'auto_ticket_status':
          row[col.id] = sampleAutoTicketStatuses[Math.floor(seededRandom(seed++) * sampleAutoTicketStatuses.length)];
          break;
        case 'manual_ticket_status':
          row[col.id] = sampleManualTicketStatuses[Math.floor(seededRandom(seed++) * sampleManualTicketStatuses.length)];
          break;
        case 'source_of_complaint':
          row[col.id] = sampleSourceOfComplaint[Math.floor(seededRandom(seed++) * sampleSourceOfComplaint.length)];
          break;
        case 'email_subject':
          row[col.id] = seededRandom(seed++) > 0.6 ? `Escalation for AWB ${awbNumber}` : '';
          break;
        case 'ticket_delay':
          row[col.id] = Math.floor(seededRandom(seed++) * 15);
          break;
        case 'duplicate_awb':
          row[col.id] = seededRandom(seed++) > 0.8 ? awbNumber.toString() : '';
          break;
        case 'last_modified_by':
          row[col.id] = sampleLastModifiedBy[Math.floor(seededRandom(seed++) * sampleLastModifiedBy.length)];
          break;
        case 'seller_name':
          row[col.id] = sampleSellerNames[Math.floor(seededRandom(seed++) * sampleSellerNames.length)];
          break;
        case 'entity_id':
          row[col.id] = Math.floor(1000 + seededRandom(seed++) * 8999);
          break;
        case 'lr_number':
          row[col.id] = seededRandom(seed++) > 0.5 ? `LR${Math.floor(100000 + seededRandom(seed++) * 899999)}` : '';
          break;
        case 'partner_comment_ndr':
          row[col.id] = seededRandom(seed++) > 0.6 ? samplePartnerCommentNDR[Math.floor(seededRandom(seed++) * samplePartnerCommentNDR.length)] : '';
          break;
        case 'edd_partner':
          row[col.id] = sampleEddPartner[Math.floor(seededRandom(seed++) * sampleEddPartner.length)];
          break;
        case 'reattempt_count':
          row[col.id] = Math.floor(seededRandom(seed++) * 5);
          break;
        case 'shipment_booking_date':
          row[col.id] = new Date(baseDate + seededRandom(seed++) * 180 * 24 * 60 * 60 * 1000);
          break;
        case 'closure_datetime':
          row[col.id] = seededRandom(seed++) > 0.6 ? new Date(baseDate + 210 * 24 * 60 * 60 * 1000) : null;
          break;
        case 'created_at':
          row[col.id] = new Date(baseDate + seededRandom(seed++) * 180 * 24 * 60 * 60 * 1000);
          break;
        case 'updated_at':
          row[col.id] = new Date(baseDate + 200 * 24 * 60 * 60 * 1000 + i * 1000 * 60 * 60);
          break;
        default:
          // Handle generic column types
          switch (col.type) {
            case 'text':
              row[col.id] = col.defaultValue || `Aman singh ${i}`;
              break;
            case 'longtext':
              row[col.id] = `Additional details for ${col.label}.`;
              break;
            case 'number':
              row[col.id] = Math.floor(seededRandom(seed++) * 10000);
              break;
            case 'email':
              row[col.id] = `user${i}@example.com`;
              break;
            case 'phone':
              row[col.id] = `${Math.floor(7000000000 + seededRandom(seed++) * 2999999999)}`;
              break;
            case 'url':
              row[col.id] = `https://example.com/${col.id}/${i}`;
              break;
            case 'date':
            case 'datetime':
              row[col.id] = new Date(baseDate + seededRandom(seed++) * 180 * 24 * 60 * 60 * 1000);
              break;
            case 'checkbox':
              row[col.id] = seededRandom(seed++) > 0.5;
              break;
            case 'dropdown':
            case 'status':
              const options = col.options || [];
              row[col.id] = options[Math.floor(seededRandom(seed++) * options.length)]?.value || col.defaultValue;
              break;
            case 'user':
              const userIds = ['1', '2', '3'];
              row[col.id] = seededRandom(seed++) > 0.3 ? userIds[Math.floor(seededRandom(seed++) * userIds.length)] : null;
              break;
            default:
              row[col.id] = col.defaultValue || '';
          }
      }
    });

    data.push(row);
  }

  return data;
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
  const toolbarRef = useRef<ToolbarRef>(null);
  const hasAppliedDefaultFilters = useRef(false);

  // Fetch sheet data from API based on sheet ID
  const { 
    data: apiData, 
    isLoading, 
    isError, 
    error 
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

      return emptyRow;
    });

    return [...result, ...emptyRows];
  }, [data, viewState.columnFilters, config.columns]);

  const handleCellUpdate = async (rowId: string, columnId: string, value: any) => {
    // Check if this is the shipment_no column for escalation sheet
    const isShipmentNoUpdate = columnId === 'shipment_no' && config.id === 'escalations' && value;

    // Check if this is an empty row being edited
    if (rowId.startsWith('empty-')) {
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
                if (row.id === newRow.id) {
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
      setData((prev) =>
        prev.map((row) => {
          if (row.id === rowId) {
            return {
              ...row,
              [columnId]: value,
              updatedAt: new Date(),
            };
          }
          return row;
        })
      );

      // If shipment number was updated, fetch details from backend
      if (isShipmentNoUpdate) {
        try {
          toast.loading('Fetching escalation details...', { id: 'fetch-escalation' });
          const response = await sheetApiService.updateEscalationSheet(String(value));
          
          if (response.data?.escalation) {
            // Update the row with data from backend
            setData((prev) =>
              prev.map((row) => {
                if (row.id === rowId) {
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
    const rowToDuplicate = data.find((row) => row.id === rowId);
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
    const index = data.findIndex((row) => row.id === rowId);
    setData((prev) => [
      ...prev.slice(0, index + 1),
      newRow,
      ...prev.slice(index + 1),
    ]);
  };

  const handleCopyRow = (rowId: string) => {
    const rowToCopy = data.find((row) => row.id === rowId);
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
    setData((prev) => prev.filter((row) => row.id !== rowId));
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
