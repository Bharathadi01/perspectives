import { create } from 'zustand';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  setStatus: (status: SessionStatus) => void;
}

/** Client-only session flag. Server truth (profile, inbox, ...) lives in TanStack Query. */
export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  setStatus: (status) => set({ status }),
}));
