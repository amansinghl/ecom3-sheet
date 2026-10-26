'use client';

import { useState } from 'react';
import { Bell, BellOff, BellRing, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RemarkNotificationItem, RemarkNotifications } from '@/hooks/use-remark-notifications';

interface NotificationBellProps {
  notifications: RemarkNotifications;
  /** Opens the row's thread. The bell closes itself first. */
  onOpenThread: (rowId: string) => void;
}

function relativeTime(createdAt: string): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

function NotificationRow({
  item,
  onOpen,
  onDismiss,
}: {
  item: RemarkNotificationItem;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const when = relativeTime(item.createdAt);

  return (
    <li className="group flex items-start gap-2 border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 px-3 py-2 text-left hover:bg-muted/60"
      >
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">
            {item.authorName || 'Someone'}
          </span>
          {item.reference && (
            <span className="truncate text-[10px] text-muted-foreground">{item.reference}</span>
          )}
          {when && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{when}</span>}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body || 'New remark'}</p>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Mark as read"
            className="mr-1.5 mt-2 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Mark as read</TooltipContent>
      </Tooltip>
    </li>
  );
}

/**
 * Unread remark threads for the signed-in user.
 *
 * The in-app list is the source of truth and works whatever the browser decided
 * about notifications; the desktop alerts are an extra the user opts into from
 * here, because the permission prompt needs a click to count.
 */
export function NotificationBell({ notifications, onOpenThread }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { items, count, truncated, permission, enablePush, dismiss, dismissAll } = notifications;

  const Icon = permission === 'denied' ? BellOff : count > 0 ? BellRing : Bell;

  const openThread = (rowId: string) => {
    setOpen(false);
    onOpenThread(rowId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 shrink-0 rounded-full"
              aria-label={count > 0 ? `${count} unread remarks` : 'Remark notifications'}
            >
              <Icon className={cn('h-4 w-4', count > 0 && 'text-primary')} />
              {count > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {count > 0 ? `${count} unread remark${count === 1 ? '' : 's'}` : 'No unread remarks'}
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold">Notifications</span>
          {count > 0 && (
            <button
              type="button"
              onClick={dismissAll}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>

        {permission === 'default' && (
          <div className="border-b bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Get a desktop alert when someone tags you, while this tab is open.
            </p>
            <Button size="sm" variant="outline" className="mt-1.5 h-6 text-[11px]" onClick={enablePush}>
              Turn on alerts
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="border-b bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            Desktop alerts are blocked for this site. Unblock them in the browser&apos;s site
            settings; this list keeps working either way.
          </div>
        )}

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nothing new. Remarks on your tickets show up here.
          </p>
        ) : (
          <>
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <NotificationRow
                  key={item.rowId}
                  item={item}
                  onOpen={() => openThread(item.rowId)}
                  onDismiss={() => dismiss(item.rowId)}
                />
              ))}
            </ul>
            {truncated && (
              <p className="border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                Showing the newest {items.length} of {count}. The rest are on the sheet under the
                Unread filter.
              </p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
