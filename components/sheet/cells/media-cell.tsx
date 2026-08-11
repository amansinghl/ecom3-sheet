'use client';

import { useRef, useState, memo } from 'react';
import { format } from 'date-fns';
import { ColumnConfig, MediaItem, RowData } from '@/types';
import { ApiError } from '@/lib/api/client';
import { RowHeight } from '@/lib/store/sheet-store';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MEDIA_MAX_FILES_PER_UPLOAD,
  MEDIA_MAX_FILE_SIZE_BYTES,
  sheetApiService,
} from '@/lib/api/sheets';
import { toast } from 'sonner';
import {
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

interface MediaCellProps {
  value: unknown;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  rowData?: RowData; // Full row data - the backend row id is needed for the media endpoints
  globalSearch?: string;
  initialValue?: string;
  onEdit: () => void;
  onSave: (value: MediaItem[]) => void;
  onCancel: () => void;
}

/** Rows that only exist in the grid (not yet persisted) cannot hold attachments */
function isPersistedRowId(rowId: unknown): boolean {
  if (typeof rowId === 'number') return true;
  if (typeof rowId !== 'string') return false;
  return rowId.length > 0 && !rowId.startsWith('row-') && !rowId.startsWith('empty-');
}

function toMediaList(value: unknown): MediaItem[] {
  return Array.isArray(value) ? (value as MediaItem[]) : [];
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const size = bytes / Math.pow(1024, exponent);
  const rounded = exponent === 0 || size >= 10 ? Math.round(size) : size.toFixed(1);
  return `${rounded} ${units[exponent]}`;
}

function formatUploadedAt(uploadedAt: string): string {
  if (!uploadedAt) return '';
  const date = new Date(uploadedAt);
  if (Number.isNaN(date.getTime())) return uploadedAt;
  return format(date, 'MMM dd, yyyy hh:mm a');
}

/**
 * Compact attachments cell: paperclip + count, or a subtle add affordance.
 * The dialog is only mounted while open so the virtualized grid stays cheap.
 */
export const MediaCell = memo(function MediaCell({
  value,
  canEdit,
  rowHeight,
  rowData,
  onSave,
}: MediaCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);

  const media = toMediaList(value);
  const count = media.length;

  return (
    <>
      <div className={cn('h-full w-full flex items-center', paddingClass)}>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-muted',
            textSizeClass,
            count > 0 ? 'text-gray-900 font-semibold' : 'text-muted-foreground'
          )}
          title={count > 0 ? `${count} attachment(s)` : 'Add attachments'}
        >
          {count > 0 ? (
            <>
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span>{count}</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </>
          )}
        </button>
      </div>

      {dialogOpen && (
        <MediaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          media={media}
          rowId={rowData?.id}
          shipmentNo={rowData?.shipment_no}
          canEdit={canEdit}
          onMediaChange={onSave}
        />
      )}
    </>
  );
});

interface MediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaItem[];
  rowId: unknown;
  shipmentNo?: string | number;
  canEdit: boolean;
  onMediaChange: (media: MediaItem[]) => void;
}

function MediaDialog({
  open,
  onOpenChange,
  media,
  rowId,
  shipmentNo,
  canEdit,
  onMediaChange,
}: MediaDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Attachments are managed straight against the media endpoints; the resulting
  // list is pushed back into the row through the sheet's normal cell-save path
  // (onSave -> onCellUpdate), so no full sheet refetch is needed.
  const canManage = canEdit && isPersistedRowId(rowId);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Allow re-picking the same file after an error / a completed upload
    event.target.value = '';

    if (files.length === 0) return;

    if (files.length > MEDIA_MAX_FILES_PER_UPLOAD) {
      toast.error(`You can upload at most ${MEDIA_MAX_FILES_PER_UPLOAD} files at a time`);
      return;
    }

    const tooLarge = files.find((file) => file.size > MEDIA_MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      toast.error(`"${tooLarge.name}" is larger than ${formatFileSize(MEDIA_MAX_FILE_SIZE_BYTES)}`);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const updated = await sheetApiService.uploadEscalationMedia(
        rowId as string | number,
        files,
        setProgress
      );
      onMediaChange(updated);
      toast.success(`Uploaded ${files.length} attachment${files.length > 1 ? 's' : ''}`);
    } catch (error) {
      const apiError = error as ApiError | undefined;
      toast.error(apiError?.message || apiError?.error || 'Failed to upload attachments');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    setPendingDeleteKey(null);
    setDeletingKey(item.key);
    try {
      const updated = await sheetApiService.deleteEscalationMedia(
        rowId as string | number,
        item.key
      );
      onMediaChange(updated);
      toast.success(`Deleted ${item.name}`);
    } catch (error) {
      const apiError = error as ApiError | undefined;
      toast.error(apiError?.message || apiError?.error || 'Failed to delete attachment');
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>
            {shipmentNo
              ? `Files attached to shipment ${shipmentNo}`
              : 'Files attached to this escalation'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-3 pr-3">
            {media.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No attachments yet
              </div>
            )}

            {media.map((item) => (
              <div key={item.key} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-all">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(item.size)}
                      {item.uploaded_by ? ` · ${item.uploaded_by}` : ''}
                      {item.uploaded_at ? ` · ${formatUploadedAt(item.uploaded_at)}` : ''}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteKey(item.key)}
                      disabled={deletingKey === item.key}
                      className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      title="Delete attachment"
                    >
                      {deletingKey === item.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                <MediaPreview item={item} />

                {pendingDeleteKey === item.key && (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-2 py-1.5">
                    <span className="text-xs text-destructive">
                      Delete this attachment permanently?
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setPendingDeleteKey(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t pt-3">
          {/* No accept filter: any format is allowed */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
            disabled={isUploading}
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canManage || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading {progress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload files
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {canManage
                ? `Up to ${MEDIA_MAX_FILES_PER_UPLOAD} files, ${formatFileSize(MEDIA_MAX_FILE_SIZE_BYTES)} each. Any format.`
                : canEdit
                  ? 'Save this row before adding attachments.'
                  : 'You do not have permission to manage attachments.'}
            </span>
          </div>
          {isUploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={item.name}
        className="max-h-56 w-auto max-w-full rounded border object-contain"
      />
    );
  }

  if (item.kind === 'audio') {
    return <audio controls src={item.url} className="w-full" />;
  }

  if (item.kind === 'video') {
    return (
      <video controls src={item.url} className="max-h-56 w-full rounded border" />
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
    >
      <ExternalLink className="h-3 w-3" />
      Download {item.name}
    </a>
  );
}
