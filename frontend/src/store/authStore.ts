import { create } from 'zustand';
import { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  setInitializationError: (error: string | null) => void;
  setAuth: (user: User, accessToken: string) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  clearAuth: () => void;
  setInitializing: (isInitializing: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  initializationError: null,
  setInitializationError: (initializationError) => set({ initializationError }),

  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isInitializing: false,
    }),

  updateUser: (updatedFields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    }),

  setInitializing: (isInitializing) =>
    set({
      isInitializing,
    }),
}));
