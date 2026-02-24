'use client';

import { useState, memo } from 'react';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCellPadding } from './cell-utils';
import { sheetApiService } from '@/lib/api/sheets';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EscalationButtonCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  rowData?: any; // Full row data to access reference_number, message, sender_name, manual_case
  globalSearch?: string;
  initialValue?: string;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export const EscalationButtonCell = memo(function EscalationButtonCell({
  value,
  columnConfig,
  rowHeight,
  rowData,
  onSave,
}: EscalationButtonCellProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const queryClient = useQueryClient();

  // Check if already added - use is_added_in_escalations field from rowData
  const isAdded = rowData?.is_added_in_escalations === 1 || value === 'Added' || value === true || value === 'added';

  const paddingClass = getCellPadding(rowHeight);

  const handleAddClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmAdd = async () => {
    setShowConfirmDialog(false);
    
    if (!rowData) {
      toast.error('Row data not available');
      return;
    }

    const reference_number = rowData.reference_number || rowData.primary_reference;
    const message = rowData.message || '';
    const sender_name = rowData.sender_name || '';
    const manual_case = rowData.manual_case || '';
    const redis_key = rowData._redis_key || '';

    if (!reference_number) {
      toast.error('Reference number is required');
      return;
    }

    setIsLoading(true);
    try {
      await sheetApiService.addEscalationFromN8N(reference_number, {
        manual_case: manual_case,
        notes: message,
        is_from_n8n: 1,
        _redis_key: redis_key,
      });

      // Invalidate n8n-logs query cache to refresh the data with updated is_added_in_escalations flag
      await queryClient.invalidateQueries({ queryKey: ['sheet', 'n8n-logs'] });
      
      // Save the 'Added' state to persist it
      onSave('Added');
      toast.success('Successfully added to escalations');
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || 'Failed to add to escalations';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const reference_number = rowData?.reference_number || rowData?.primary_reference || '';
  const manual_case = rowData?.manual_case || '';

  return (
    <>
      <div
        className={cn(
          'h-full w-full flex items-center justify-center',
          paddingClass
        )}
      >
        {isAdded ? (
          <span className="text-green-600 font-semibold">Added</span>
        ) : (
          <Button
            onClick={handleAddClick}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Adding...
              </>
            ) : (
              'add'
            )}
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Add to Escalations</DialogTitle>
            <DialogDescription>
              Are you sure you want to add this entry to escalations?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {reference_number && (
              <div className="text-sm">
                <span className="font-medium">Reference Number:</span>{' '}
                <span className="text-muted-foreground">{reference_number}</span>
              </div>
            )}
            {manual_case && (
              <div className="text-sm">
                <span className="font-medium">Manual Case:</span>{' '}
                <span className="text-muted-foreground">{manual_case}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
