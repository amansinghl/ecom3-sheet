'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusOption } from '@/types';

interface ManualCaseDialogProps {
  open: boolean;
  shipmentNo: string | number;
  shipmentIndex: number;
  totalShipments: number;
  manualCaseOptions: StatusOption[];
  onSelect: (manualCase: string) => void;
  onSkip: () => void;
}

export function ManualCaseDialog({
  open,
  shipmentNo,
  shipmentIndex,
  totalShipments,
  manualCaseOptions,
  onSelect,
  onSkip,
}: ManualCaseDialogProps) {
  const [selectedCase, setSelectedCase] = useState<string>('');

  const handleConfirm = () => {
    if (selectedCase) {
      onSelect(selectedCase);
      setSelectedCase('');
    }
  };

  const handleSkip = () => {
    onSkip();
    setSelectedCase('');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Select Manual Case ({shipmentIndex + 1} of {totalShipments})
          </DialogTitle>
          <DialogDescription>
            Shipment No: <span className="font-semibold">{shipmentNo}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {manualCaseOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedCase(option.value)}
                className={`
                  p-3 rounded-md border-2 text-left transition-all
                  ${selectedCase === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ backgroundColor: option.color }}
                />
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedCase}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

