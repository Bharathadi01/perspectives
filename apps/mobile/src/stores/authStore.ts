import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isAdult: boolean;
  termsAccepted: boolean;
  login: () => void;
  logout: () => void;
  setAgeVerified: (isAdult: boolean) => void;
  setTermsAccepted: (accepted: boolean) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Default to authenticated & onboarded for immediate development/testing,
  // but fully guarded if toggled off
  isAuthenticated: true,
  isOnboarded: true,
  isAdult: true,
  termsAccepted: true,
  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false, isOnboarded: false }),
  setAgeVerified: (isAdult) => set({ isAdult }),
  setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),
  completeOnboarding: () => set({ isOnboarded: true }),
}));
