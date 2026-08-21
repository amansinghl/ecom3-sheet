'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Eye, Lock, MessageSquare, Send, Sparkles, Zap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getRandomAvatar } from '@/lib/config/user-avatar';
import { buildGuestBlockReply, isThreadParticipant, personForEmail } from '@/lib/mock/row-threads';
import { useThreadStore } from '@/lib/store/thread-store';
import { cn } from '@/lib/utils';
import { ColumnConfig, MediaItem, RowData, SheetConfig, ThreadMessage, ThreadVisibility } from '@/types';

interface RowThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RowData | null;
  config: SheetConfig;
}

// Rendered as chips in the header rather than repeated in the field list below.
const HEADER_STATUS_COLUMNS = ['manual_case', 'manual_ticket_status', 'auto_ticket_status', 'status'];

// Derived or interactive columns have no meaningful read-only value.
const SKIPPED_COLUMN_TYPES = new Set(['highlights', 'action-button']);

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function initialsFor(text: string): string {
  if (!text) return '?';
  const name = text.includes('@') ? text.split('@')[0] : text;
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * The Attachments column holds media objects, not text, so String(value) would
 * render "[object Object]". Same trap as the CSV export.
 */
function formatFieldValue(value: unknown, column: ColumnConfig): string {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => (item && typeof item === 'object' ? (item as MediaItem).name : String(item)))
      .filter(Boolean);
    return names.length ? names.join(', ') : `${value.length} item(s)`;
  }

  if (column.type === 'date' || column.type === 'datetime') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return format(date, column.type === 'datetime' ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy');
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, dd MMM yyyy');
}

export function RowThreadDialog({ open, onOpenChange, row, config }: RowThreadDialogProps) {
  const { data: session } = useSession();
  const currentEmail = session?.user?.email || '';

  const hydrate = useThreadStore((state) => state.hydrate);
  const openThread = useThreadStore((state) => state.openThread);
  const addMessage = useThreadStore((state) => state.addMessage);
  const markRead = useThreadStore((state) => state.markRead);
  const storedThread = useThreadStore((state) => (row ? state.threads[row.id] : undefined));

  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState<ThreadVisibility>('internal');
  const [blockedAttempts, setBlockedAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canPost = isThreadParticipant(currentEmail);
  const me = personForEmail(currentEmail);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Seeding on open (not on mount) keeps closed rows out of localStorage.
  useEffect(() => {
    if (!open || !row) return;
    openThread(row);
    markRead(row.id);
  }, [open, row, openThread, markRead]);

  const messages = useMemo(() => storedThread || [], [storedThread]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages.length]);

  const headerChips = useMemo(() => {
    if (!row) return [];
    return HEADER_STATUS_COLUMNS.map((columnId) => {
      const column = config.columns.find((col) => col.id === columnId);
      if (!column || !hasValue(row[columnId])) return null;
      return { label: column.label, value: formatFieldValue(row[columnId], column) };
    }).filter(Boolean) as { label: string; value: string }[];
  }, [row, config.columns]);

  const detailFields = useMemo(() => {
    if (!row) return [];
    return config.columns
      .filter((column) => !SKIPPED_COLUMN_TYPES.has(column.type))
      .filter((column) => hasValue(row[column.id]))
      .map((column) => ({ column, value: formatFieldValue(row[column.id], column) }));
  }, [row, config.columns]);

  const handleSend = useCallback(() => {
    if (!row) return;
    const body = draft.trim();
    if (!body) return;

    // MOCK: only the two seeded accounts can post. Everyone else gets told, in
    // character, that the feature is not finished.
    if (!canPost || !me) {
      const attempt = blockedAttempts + 1;
      setBlockedAttempts(attempt);
      addMessage(buildGuestBlockReply(row.id, attempt));
      markRead(row.id);
      setDraft('');
      return;
    }

    addMessage({
      id: `${row.id}-live-${Date.now()}`,
      rowId: row.id,
      authorEmail: me.email,
      authorName: me.name,
      body,
      createdAt: new Date().toISOString(),
      kind: 'message',
      visibility,
    });
    // Own post must not come back as unread on the grid badge.
    markRead(row.id);
    setDraft('');
  }, [row, draft, canPost, me, blockedAttempts, addMessage, markRead, visibility]);

  const title = row ? String(row.shipment_no || row.awb_no || row.id) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-3 pr-12">
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {row?.awb_no && row?.shipment_no ? (
            <span className="text-sm text-muted-foreground">AWB {String(row.awb_no)}</span>
          ) : null}
          {headerChips.map((chip) => (
            <Badge key={chip.label} variant="secondary" className="font-normal">
              {chip.value}
            </Badge>
          ))}
          <Badge variant="outline" className="ml-auto gap-1 border-amber-400 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            Mock
          </Badge>
        </div>
        <DialogDescription className="sr-only">
          Discussion thread for this row. Messages are stored locally and are not sent anywhere.
        </DialogDescription>

        {/* Body */}
        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
          {/* Row detail rail */}
          <div className="hidden min-h-0 flex-col overflow-y-auto border-r bg-muted/30 md:flex">
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Shipment details
              </p>
              <dl className="space-y-3">
                {detailFields.map(({ column, value }) => (
                  <div key={column.id} className="text-left">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {column.label}
                    </dt>
                    <dd className="text-sm break-words whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
                {detailFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">This row is empty.</p>
                )}
              </dl>
            </div>
          </div>

          {/* Thread */}
          <div className="flex min-h-0 flex-col">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {messages.map((message, index) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  previous={messages[index - 1]}
                  isMine={message.authorEmail === currentEmail}
                />
              ))}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t p-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write a note. Enter to send, Shift plus Enter for a new line."
                className="max-h-[140px] min-h-[64px] resize-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setVisibility(visibility === 'internal' ? 'shipper' : 'internal')}
                >
                  {visibility === 'internal' ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Internal only
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Visible to shipper
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto gap-1.5"
                  disabled={draft.trim() === ''}
                  onClick={handleSend}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MessageRowProps {
  message: ThreadMessage;
  previous?: ThreadMessage;
  isMine: boolean;
}

function MessageRow({ message, previous, isMine }: MessageRowProps) {
  const showDaySeparator = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

  if (message.kind === 'event') {
    return (
      <>
        {showDaySeparator && <DaySeparator iso={message.createdAt} />}
        <div className="my-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>{message.body}</span>
          <span className="opacity-60">{format(new Date(message.createdAt), 'HH:mm')}</span>
        </div>
      </>
    );
  }

  // Consecutive messages from the same person collapse into one block, which is
  // what keeps a long thread readable with several participants.
  const isGrouped =
    !showDaySeparator &&
    previous?.kind === 'message' &&
    previous.authorEmail === message.authorEmail &&
    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 10 * 60_000;

  return (
    <>
      {showDaySeparator && <DaySeparator iso={message.createdAt} />}
      <div className={cn('flex gap-3', isGrouped ? 'mt-0.5' : 'mt-4')}>
        <div className="w-8 shrink-0">
          {!isGrouped && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={getRandomAvatar(message.authorEmail)} alt={message.authorName} />
              <AvatarFallback className="text-[11px]">{initialsFor(message.authorName)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {!isGrouped && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">
                {message.authorName}
                {isMine && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
              </span>
              <span
                className="text-xs text-muted-foreground"
                title={format(new Date(message.createdAt), 'dd MMM yyyy, HH:mm')}
              >
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
              {message.visibility === 'shipper' && (
                <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
                  <Eye className="h-2.5 w-2.5" />
                  Shipper
                </Badge>
              )}
            </div>
          )}
          <p className="text-sm break-words whitespace-pre-wrap">{message.body}</p>
        </div>
      </div>
    </>
  );
}

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {dayLabel(iso)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
