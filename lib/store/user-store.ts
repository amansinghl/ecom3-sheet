import { create } from 'zustand';
import { User } from '@/types';

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,
}));
