'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export type BulkUploadMode = 'create' | 'update';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  mode?: BulkUploadMode;
}

const MODE_COPY: Record<BulkUploadMode, {
  title: string;
  sampleName: string;
  hint: string;
  action: string;
  actionLoading: string;
}> = {
  create: {
    title: 'Bulk Upload Escalations',
    sampleName: 'KB_Bulk_Upload_sheet.xlsx',
    hint: 'Columns: AWB No OR VSID, Manual Case, Notes, Source of Complaint.',
    action: 'Upload & Process',
    actionLoading: 'Uploading...',
  },
  update: {
    title: 'Bulk Update Tickets',
    sampleName: 'KB_Bulk_Update_sheet.xlsx',
    hint: 'Columns: VSID, Email Subject (replaces existing), OPS Remarks (appended with timestamp). Lookup is by VSID only.',
    action: 'Update & Process',
    actionLoading: 'Updating...',
  },
};

export function BulkUploadModal({ isOpen, onClose, onUpload, mode = 'create' }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copy = MODE_COPY[mode];

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsDragging(false);
    }
  }, [isOpen, mode]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
    ];
    
    const validExtensions = ['.xlsx', '.xls', '.csv', '.ods', '.xlsm'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (
      validTypes.includes(selectedFile.type) ||
      validExtensions.includes(fileExtension)
    ) {
      setFile(selectedFile);
    } else {
      alert('Invalid file type. Please upload a CSV or Excel file.');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file);
      setFile(null);
      onClose();
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsUploading(false);
    }
  }, [file, onUpload, onClose]);

  const handleDownloadSample = useCallback(() => {
    if (mode === 'update') {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['VSID', 'Email Subject', 'OPS Remarks'],
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Update');
      XLSX.writeFile(workbook, copy.sampleName);
      return;
    }

    // Create sample stays the static file already used by OPS
    const link = document.createElement('a');
    link.href = '/KB_Bulk_Upload_sheet.xlsx';
    link.download = copy.sampleName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [mode, copy.sampleName]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setFile(null);
      onClose();
    }
  }, [isUploading, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload File Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Upload File <span className="text-destructive">*</span>
            </label>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.ods"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />
              
              <Upload className={cn(
                'h-8 w-8 mb-2',
                file ? 'text-primary' : 'text-muted-foreground'
              )} />
              
              <p className="text-sm text-center px-4">
                Drop file here or{' '}
                <span className="text-primary font-medium underline">click to upload</span>
              </p>
              
              {file && (
                <p className="text-xs text-muted-foreground mt-2 px-4 text-center truncate w-full">
                  {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Download Sample File */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadSample}
              className="text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample Excel File
            </Button>
          </div>

          {/* Supported Formats */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Supported formats:</span>{' '}
              CSV, Excel (.xlsx, .xls, .xlsb), OpenDocument (.ods)
            </p>
            <p className="text-xs text-muted-foreground">{copy.hint}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? copy.actionLoading : copy.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
