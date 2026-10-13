import { create } from 'zustand';
import { RowData } from '@/types';
import { isChatParticipant, remarkSnapshot } from '@/lib/remarks';

const STORAGE_KEY = 'sheet-remark-read-v1';

interface RemarkReadStore {
  snapshots: Record<string, string>;
  hydrated: boolean;
  /** True once this browser has recorded the sheet as already seen. */
  baselined: boolean;
  hydrate: () => void;
  captureBaseline: (rows: RowData[]) => void;
  markRead: (row: RowData) => void;
}

function readSnapshots(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persist(snapshots: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

export const useRemarkReadStore = create<RemarkReadStore>((set, get) => ({
  snapshots: {},
  hydrated: false,
  baselined: false,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    set({
      snapshots: readSnapshots(),
      baselined: stored !== null,
      hydrated: true,
    });
  },

  // First visit records every current thread as read, so only a later message lights the row.
  captureBaseline: (rows) => {
    if (get().baselined || rows.length === 0) return;
    const snapshots: Record<string, string> = {};
    rows.forEach((row) => {
      snapshots[String(row.id)] = remarkSnapshot(row);
    });
    set({ snapshots, baselined: true });
    persist(snapshots);
  },

  markRead: (row) => {
    const snapshots = { ...get().snapshots, [String(row.id)]: remarkSnapshot(row) };
    set({ snapshots });
    persist(snapshots);
  },
}));

export function isRemarkUnread(
  row: RowData | undefined,
  snapshots: Record<string, string>,
  ready: boolean,
  userName: string
): boolean {
  if (!ready || !row || !isChatParticipant(row, userName)) return false;
  const current = remarkSnapshot(row);
  if (current === '') return false;
  return snapshots[String(row.id)] !== current;
}

export function useRemarkUnread(row: RowData | undefined, userName: string): boolean {
  const ready = useRemarkReadStore((state) => state.hydrated && state.baselined);
  const snapshots = useRemarkReadStore((state) => state.snapshots);
  return isRemarkUnread(row, snapshots, ready, userName);
}
