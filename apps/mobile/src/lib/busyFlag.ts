import { create } from 'zustand';

interface BusyState {
  keys: Record<string, true>;
  setBusy: (key: string, busy: boolean) => void;
}

const useBusyStore = create<BusyState>((set) => ({
  keys: {},
  setBusy: (key, busy) =>
    set((state) => {
      if (busy) {
        if (state.keys[key]) return state;
        return { keys: { ...state.keys, [key]: true } };
      }
      if (!state.keys[key]) return state;
      const next = { ...state.keys };
      delete next[key];
      return { keys: next };
    }),
}));

/**
 * Marks the person as mid-task, so an interrupting moment (the "you're
 * connected" screen) waits. Route prefixes used to carry this, but editing now
 * happens on the You tab, where the path alone cannot tell editing apart from
 * simply looking at your own profile.
 */
export function setBusy(key: string, busy: boolean): void {
  useBusyStore.getState().setBusy(key, busy);
}

export function useIsBusy(): boolean {
  return useBusyStore((state) => Object.keys(state.keys).length > 0);
}
