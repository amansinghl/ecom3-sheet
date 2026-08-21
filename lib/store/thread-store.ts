/**
 * MOCK store for per-row discussion threads.
 *
 * Persisted to localStorage so a message posted during a demo survives a
 * refresh - a prototype that forgets everything on reload demos badly. Nothing
 * here reaches the API. See lib/mock/row-threads.ts (THREADS_ARE_MOCK).
 */

import { create } from 'zustand';
import { RowData, ThreadMessage } from '@/types';
import { buildSeedThread, seedThreadIsUnread } from '@/lib/mock/row-threads';

const STORAGE_KEY = 'sheet-row-threads-mock-v1';
const READ_STORAGE_KEY = 'sheet-row-threads-read-mock-v1';

type ThreadMap = Record<string, ThreadMessage[]>;
type ReadMap = Record<string, string>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

interface ThreadStore {
  /** Only rows that have been opened or posted to are held here. */
  threads: ThreadMap;
  lastReadAt: ReadMap;
  hydrated: boolean;

  hydrate: () => void;
  /** Seeds the row's thread on first open so later posts append to real history. */
  openThread: (row: RowData) => void;
  addMessage: (message: ThreadMessage) => void;
  markRead: (rowId: string) => void;
  getMessages: (row: RowData) => ThreadMessage[];
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threads: {},
  lastReadAt: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      threads: readJson<ThreadMap>(STORAGE_KEY, {}),
      lastReadAt: readJson<ReadMap>(READ_STORAGE_KEY, {}),
      hydrated: true,
    });
  },

  openThread: (row) => {
    if (get().threads[row.id]) return;
    const threads = { ...get().threads, [row.id]: buildSeedThread(row) };
    set({ threads });
    writeJson(STORAGE_KEY, threads);
  },

  addMessage: (message) => {
    const existing = get().threads[message.rowId] || [];
    const threads = { ...get().threads, [message.rowId]: [...existing, message] };
    set({ threads });
    writeJson(STORAGE_KEY, threads);
  },

  markRead: (rowId) => {
    const lastReadAt = { ...get().lastReadAt, [rowId]: new Date().toISOString() };
    set({ lastReadAt });
    writeJson(READ_STORAGE_KEY, lastReadAt);
  },

  getMessages: (row) => get().threads[row.id] || buildSeedThread(row),
}));

/** True while the row has messages newer than the last time it was opened. */
export function useThreadUnread(row: RowData | undefined): boolean {
  const lastRead = useThreadStore((state) => (row ? state.lastReadAt[row.id] : undefined));
  const stored = useThreadStore((state) => (row ? state.threads[row.id] : undefined));
  if (!row) return false;

  const messages = stored || buildSeedThread(row);
  if (messages.length === 0) return false;
  if (!lastRead) return seedThreadIsUnread(row);

  return messages[messages.length - 1].createdAt > lastRead;
}
