import { create } from 'zustand';

/**
 * A request to open one row's remark thread, made from outside the grid.
 *
 * The notification bell sits in the header, above the router, so it cannot
 * reach the grid's own thread state. It parks a row id here and the grid picks
 * it up once that row is on screen, which also covers the bell navigating from
 * another sheet: the request survives the route change and opens on arrival.
 */
interface ThreadRequestStore {
  rowId: string | null;
  request: (rowId: string) => void;
  clear: () => void;
}

export const useThreadRequestStore = create<ThreadRequestStore>((set) => ({
  rowId: null,
  request: (rowId) => set({ rowId }),
  clear: () => set({ rowId: null }),
}));
