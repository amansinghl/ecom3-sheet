'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, Send } from 'lucide-react';

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
import { activeMention, appendRemark, parseRemarks, RemarkColumnId, RemarkMessage, REMARK_COLUMNS, remarkColumnText, remarkSnapshot } from '@/lib/remarks';
import { useRemarkReadStore } from '@/lib/store/remark-read-store';
import { cn } from '@/lib/utils';
import { ColumnConfig, MediaItem, RowData, SheetConfig } from '@/types';

interface RowThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RowData | null;
  /** Thread the dialog opens on - the grid passes the remarks cell that was clicked. */
  column: RemarkColumnId;
  config: SheetConfig;
  mentionUsers: string[];
  onCellUpdate: (rowId: string, columnId: string, value: string) => void | Promise<void>;
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

export function RowThreadDialog({ open, onOpenChange, row: activeRow, column, config, mentionUsers, onCellUpdate }: RowThreadDialogProps) {
  const { data: session } = useSession();
  const currentName = session?.user?.name || '';
  const markRead = useRemarkReadStore((state) => state.markRead);

  // The content stays mounted while the close animation plays, by which point the
  // grid has already dropped the row. Keeping the last one renders the thread the
  // user was reading all the way out instead of flashing an empty dialog.
  const lastRow = useRef<RowData | null>(null);
  if (activeRow) lastRow.current = activeRow;
  const row = activeRow ?? lastRow.current;

  const [draft, setDraft] = useState('');
  const [cursor, setCursor] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLUListElement>(null);
  const [activeColumn, setActiveColumn] = useState<RemarkColumnId>(column);
  const scrollNodes = useRef<Partial<Record<RemarkColumnId, HTMLDivElement | null>>>({});
  const seenLength = useRef<Partial<Record<RemarkColumnId, number>>>({});
  const rowRef = useRef(row);
  rowRef.current = row;

  const remarkColumns = useMemo(
    () => REMARK_COLUMNS.filter((columnId) => config.columns.some((col) => col.id === columnId)),
    [config.columns]
  );

  // Keyed on `open` as well, so reopening the same cell lands on its own thread
  // even when the last visit ended on the other tab.
  useEffect(() => {
    if (!open) return;
    setActiveColumn(column);
    setDraft('');
  }, [open, column, row?.id]);

  const remarksText = remarkColumnText(row);
  const notes = typeof row?.notes === 'string' ? row.notes.trim() : '';
  const rowId = row?.id ?? '';
  const readKey = row ? remarkSnapshot(row) : '';

  useEffect(() => {
    const current = rowRef.current;
    if (!open || !current) return;
    markRead(current);
  }, [open, rowId, readKey, markRead]);

  const threads = useMemo(() => {
    const parsed = {} as Record<RemarkColumnId, RemarkMessage[]>;
    REMARK_COLUMNS.forEach((columnId) => {
      parsed[columnId] = parseRemarks(row?.[columnId], rowId);
    });
    return parsed;
  }, [row, remarksText, rowId]);

  const setScrollNode = useCallback((columnId: RemarkColumnId, node: HTMLDivElement | null) => {
    scrollNodes.current[columnId] = node;
  }, []);

  useEffect(() => {
    seenLength.current = {};
  }, [open, rowId]);

  useEffect(() => {
    if (!open) return;
    const next = threads[activeColumn].length;
    const previous = seenLength.current[activeColumn];
    seenLength.current[activeColumn] = next;
    if (previous === next) return;
    const node = scrollNodes.current[activeColumn];
    if (!node) return;
    // First open jumps to the latest line. A new message glides there.
    node.scrollTo({ top: node.scrollHeight, behavior: previous == null ? 'auto' : 'smooth' });
  }, [open, activeColumn, threads]);

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
    const chatColumns = new Set<string>(REMARK_COLUMNS);
    return config.columns
      .filter((column) => !SKIPPED_COLUMN_TYPES.has(column.type) && !chatColumns.has(column.id))
      .filter((column) => hasValue(row[column.id]))
      .map((column) => ({ column, value: formatFieldValue(row[column.id], column) }));
  }, [row, config.columns]);

  // Unsaved rows (row-*, empty-*) have no id the API accepts - update-entries
  // silently skips them, so a message would vanish on the next refetch.
  const canSendToRow = row !== null && (typeof row.id === 'number' || !Number.isNaN(Number(row.id)));

  const mention = useMemo(() => activeMention(draft, cursor), [draft, cursor]);
  const mentionQuery = mention ? `${mention.start}:${mention.query}` : '';
  const mentionMatches = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.trim().toLowerCase();
    // Bare "@" stays closed. The first letter opens names that start with it.
    if (!query) return [];
    return mentionUsers.filter((name) => name.toLowerCase().startsWith(query)).slice(0, 8);
  }, [mention, mentionUsers]);
  const mentionOpen = mention !== null && !mentionDismissed && mentionMatches.length > 0;

  useEffect(() => {
    setMentionDismissed(false);
    setMentionIndex(0);
  }, [mentionQuery]);

  const picked = mentionMatches[Math.min(mentionIndex, Math.max(mentionMatches.length - 1, 0))];

  useEffect(() => {
    if (!mentionOpen) return;
    mentionListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [mentionOpen, picked]);

  const insertMention = useCallback((name: string) => {
    if (!mention) return;
    const next = `${draft.slice(0, mention.start)}@${name} ${draft.slice(cursor)}`;
    const caret = mention.start + name.length + 2;
    setDraft(next);
    setCursor(caret);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }, [mention, draft, cursor]);

  const handleSend = useCallback(async () => {
    if (!row || sending || !canSendToRow || !currentName) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    try {
      await onCellUpdate(String(row.id), activeColumn, appendRemark(row[activeColumn], body, currentName));
      setDraft('');
      setCursor(0);
    } finally {
      setSending(false);
    }
  }, [row, sending, canSendToRow, currentName, draft, onCellUpdate, activeColumn]);

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
        </div>
        <DialogDescription className="sr-only">
          Remarks for this shipment.
        </DialogDescription>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[300px_1fr] md:grid-rows-1">
          <div className="flex shrink-0 flex-col border-b bg-muted/30 md:min-h-0 md:overflow-y-auto md:scroll-smooth md:border-r md:border-b-0">
            <div className="sticky top-0 z-10 flex gap-2 bg-muted/30 px-4 py-3 md:pt-4">
              {remarkColumns.map((columnId) => {
                const column = config.columns.find((col) => col.id === columnId);
                const selected = activeColumn === columnId;
                return (
                  <Button
                    key={columnId}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => {
                      setActiveColumn(columnId);
                      setDraft('');
                    }}
                  >
                    {column?.label || columnId}
                  </Button>
                );
              })}
            </div>
            <div className="hidden px-5 py-4 md:block">
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

          <div className="flex min-h-0 flex-col">
            {notes ? (
              <div className="max-h-28 shrink-0 overflow-y-auto scroll-smooth border-b bg-muted/40 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm break-words whitespace-pre-wrap">{notes}</p>
              </div>
            ) : null}
            {remarkColumns.map((columnId) => (
              <RemarkThread
                key={columnId}
                columnId={columnId}
                messages={threads[columnId]}
                mentionUsers={mentionUsers}
                active={activeColumn === columnId}
                onScrollRef={setScrollNode}
              />
            ))}

            {/* Composer */}
            <div className="relative shrink-0 border-t p-3">
              {mentionOpen && (
                <ul
                  ref={mentionListRef}
                  className="absolute bottom-full left-3 z-20 mb-2 max-h-52 w-64 overflow-y-auto bg-popover p-1.5 shadow-md"
                >
                  {mentionMatches.map((name) => {
                    const active = name === picked;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          data-active={active}
                          className={cn(
                            'w-full rounded-sm px-3 py-1.5 text-left text-sm leading-5',
                            active ? 'bg-accent font-medium' : 'hover:bg-muted'
                          )}
                          onMouseEnter={() => setMentionIndex(mentionMatches.indexOf(name))}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertMention(name);
                          }}
                        >
                          {name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setCursor(event.target.selectionStart);
                }}
                onClick={(event) => setCursor(event.currentTarget.selectionStart)}
                onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
                onKeyDown={(event) => {
                  if (mentionOpen) {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setMentionIndex((index) => (index + 1) % mentionMatches.length);
                      return;
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setMentionIndex((index) => (index - 1 + mentionMatches.length) % mentionMatches.length);
                      return;
                    }
                    if (event.key === 'Enter' || event.key === 'Tab') {
                      event.preventDefault();
                      if (picked) insertMention(picked);
                      return;
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setMentionDismissed(true);
                      return;
                    }
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write a note. @ to mention someone. Enter to send."
                className="max-h-[140px] min-h-[64px] resize-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto gap-1.5"
                  disabled={draft.trim() === '' || sending || remarkColumns.length === 0 || !canSendToRow || !currentName}
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

interface RemarkThreadProps {
  columnId: RemarkColumnId;
  messages: RemarkMessage[];
  mentionUsers: string[];
  active: boolean;
  onScrollRef: (columnId: RemarkColumnId, node: HTMLDivElement | null) => void;
}

const RemarkThread = memo(function RemarkThread({ columnId, messages, mentionUsers, active, onScrollRef }: RemarkThreadProps) {
  return (
    <div
      ref={(node) => onScrollRef(columnId, node)}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-5 py-4',
        !active && 'hidden'
      )}
    >
      {messages.map((message, index) => (
        <MessageRow
          key={message.id}
          message={message}
          mentionUsers={mentionUsers}
          previous={messages[index - 1]}
        />
      ))}
    </div>
  );
});

interface MessageRowProps {
  message: RemarkMessage;
  mentionUsers: string[];
  previous?: RemarkMessage;
}

function MentionText({ body, users }: { body: string; users: string[] }) {
  const names = [...users].sort((a, b) => b.length - a.length);
  if (names.length === 0) return <>{body}</>;
  const pattern = new RegExp(`@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=\\s|$)`, 'gi');
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(body.slice(last, index));
    parts.push(
      <span key={index} className="rounded-sm px-0.5 font-bold text-blue-500">
        {match[0]}
      </span>
    );
    last = index + match[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return <>{parts}</>;
}

const MessageRow = memo(function MessageRow({ message, mentionUsers, previous }: MessageRowProps) {
  const showDaySeparator = Boolean(
    message.createdAt && (!previous?.createdAt || dayLabel(previous.createdAt) !== dayLabel(message.createdAt))
  );

  const isGrouped =
    !showDaySeparator &&
    previous?.authorName === message.authorName &&
    message.authorName !== '' &&
    Boolean(message.createdAt) &&
    Boolean(previous?.createdAt) &&
    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 10 * 60_000;

  const author = message.authorName;

  return (
    <>
      {showDaySeparator && <DaySeparator iso={message.createdAt} />}
      <div className={cn('flex gap-3', isGrouped ? 'mt-0.5' : 'mt-4')}>
        <div className="w-8 shrink-0">
          {!isGrouped && author && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={getRandomAvatar(author)} alt={author} />
              <AvatarFallback className="text-[11px]">{initialsFor(author)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {!isGrouped && author && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">
                {author}
              </span>
            </div>
          )}
          <p className="text-sm break-words whitespace-pre-wrap">
            <MentionText body={message.body} users={mentionUsers} />
            {message.createdAt && (
              <span
                className="ml-2 text-xs text-muted-foreground"
                title={format(new Date(message.createdAt), 'dd MMM yyyy, HH:mm')}
              >
                {format(new Date(message.createdAt), 'hh:mm a')}
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
});

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
