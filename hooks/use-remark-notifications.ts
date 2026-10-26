'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RowData } from '@/types';
import { parseRemarks, remarkSnapshot } from '@/lib/remarks';
import { isRemarkUnread, useRemarkReadStore } from '@/lib/store/remark-read-store';
import {
  NotificationPermissionState,
  claimNotification,
  notificationPermission,
  requestNotificationPermission,
  showNotification,
} from '@/lib/notifications';

export interface RemarkNotificationItem {
  rowId: string;
  /** Shipment number where there is one, so the bell reads like the sheet. */
  reference: string;
  authorName: string;
  body: string;
  createdAt: string;
  /** Thread text at the time this item was built, used as the dedupe key. */
  snapshot: string;
}

export interface RemarkNotifications {
  items: RemarkNotificationItem[];
  count: number;
  permission: NotificationPermissionState;
  /** Prompts for permission. Call from a click - browsers ignore it otherwise. */
  enablePush: () => Promise<void>;
  /** Marks one row read without opening it. */
  dismiss: (rowId: string) => void;
  dismissAll: () => void;
}

interface Options {
  rows: RowData[];
  userName: string;
  /** Off for sheets with no remark threads. */
  enabled: boolean;
  /** Opens the row's thread when a notification or bell row is clicked. */
  onOpen: (rowId: string) => void;
}

function rowReference(row: RowData): string {
  const candidates = [row.shipment_no, row.awb_no, row.id];
  const found = candidates.find((value) => String(value ?? '').trim() !== '');
  return String(found ?? '').trim();
}

const samePerson = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Unread remark threads for the signed-in user, raised as browser
 * notifications as they appear.
 *
 * Nothing new is fetched: `useSheetData` already polls the sheet every 30s and
 * `isRemarkUnread` already decides what counts as unread for this person, so a
 * notification is just that state crossing from read to unread. Latency is
 * therefore one poll interval, which is what makes a websocket unnecessary.
 */
export function useRemarkNotifications({ rows, userName, enabled, onOpen }: Options): RemarkNotifications {
  const snapshots = useRemarkReadStore((state) => state.snapshots);
  const ready = useRemarkReadStore((state) => state.hydrated && state.baselined);
  const markRead = useRemarkReadStore((state) => state.markRead);

  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  const items = useMemo<RemarkNotificationItem[]>(() => {
    if (!enabled || !ready || !userName) return [];

    const unread: RemarkNotificationItem[] = [];

    rows.forEach((row) => {
      if (!isRemarkUnread(row, snapshots, ready, userName)) return;

      const snapshot = remarkSnapshot(row);
      const messages = parseRemarks(snapshot, String(row.id));
      const latest = messages[messages.length - 1];
      if (!latest) return;

      // Your own message is not news. markRead covers the normal path (the
      // thread is open while you post), but a post from another tab or device
      // comes back through the poll with nothing having marked it read here.
      if (samePerson(latest.authorName, userName)) return;

      unread.push({
        rowId: String(row.id),
        reference: rowReference(row),
        authorName: latest.authorName,
        body: latest.body,
        createdAt: latest.createdAt,
        snapshot,
      });
    });

    // Newest first; threads with no parseable stamp sink to the bottom.
    return unread.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [enabled, ready, rows, snapshots, userName]);

  // Opening a thread from a notification happens long after this render, so the
  // callback is held in a ref rather than captured.
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  // Rows this tab has already alerted on, at the thread text it alerted at. A
  // further message changes the snapshot and so alerts again.
  const alerted = useRef<Map<string, string>>(new Map());
  const primed = useRef(false);

  useEffect(() => {
    if (!enabled || !ready) return;

    // The first pass after hydration is the existing backlog, not new traffic.
    // Record it silently so a page reload does not replay every open thread.
    if (!primed.current) {
      items.forEach((item) => alerted.current.set(item.rowId, item.snapshot));
      primed.current = true;
      return;
    }

    const live = new Set(items.map((item) => item.rowId));
    alerted.current.forEach((_, rowId) => {
      if (!live.has(rowId)) alerted.current.delete(rowId);
    });

    if (permission !== 'granted') return;

    items.forEach((item) => {
      if (alerted.current.get(item.rowId) === item.snapshot) return;
      alerted.current.set(item.rowId, item.snapshot);

      if (!claimNotification(item.rowId, item.snapshot)) return;

      const who = item.authorName || 'Someone';
      showNotification({
        title: item.reference ? `${who} on ${item.reference}` : `${who} tagged you`,
        body: item.body || 'New remark',
        tag: `kb-remark-${item.rowId}`,
        onClick: () => onOpenRef.current(item.rowId),
      });
    });
  }, [enabled, items, permission, ready]);

  const enablePush = useCallback(async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
  }, []);

  const rowsById = useMemo(() => {
    const map = new Map<string, RowData>();
    rows.forEach((row) => map.set(String(row.id), row));
    return map;
  }, [rows]);

  const dismiss = useCallback(
    (rowId: string) => {
      const row = rowsById.get(rowId);
      if (row) markRead(row);
    },
    [markRead, rowsById]
  );

  const dismissAll = useCallback(() => {
    items.forEach((item) => {
      const row = rowsById.get(item.rowId);
      if (row) markRead(row);
    });
  }, [items, markRead, rowsById]);

  return {
    items,
    count: items.length,
    permission,
    enablePush,
    dismiss,
    dismissAll,
  };
}
