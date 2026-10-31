import type { PostCategory } from '@perspective/contracts';
import { create } from 'zustand';
import type { PickedMedia } from '../../lib/media';

/**
 * What the account screens collect before the account exists. Sign-up needs email, password and
 * birthday together, so they wait here until Confirm. Cleared as soon as sign-up succeeds, so the
 * password never lingers in memory.
 */
interface SignupDraft {
  email: string;
  password: string;
  acceptTerms: boolean;
  set: (patch: Partial<Pick<SignupDraft, 'email' | 'password' | 'acceptTerms'>>) => void;
  clear: () => void;
}

export const useSignupDraft = create<SignupDraft>((set) => ({
  email: '',
  password: '',
  acceptTerms: false,
  set: (patch) => set(patch),
  clear: () => set({ email: '', password: '', acceptTerms: false }),
}));

/**
 * A photo post being made across two screens: the photo and question, then what to focus on.
 * Nothing is uploaded until "Save post" on the second screen.
 */
interface PhotoPostDraft {
  photo: PickedMedia | null;
  prompt: string;
  category: PostCategory | null;
  focusAreas: string[];
  set: (patch: Partial<Pick<PhotoPostDraft, 'photo' | 'prompt' | 'category' | 'focusAreas'>>) => void;
  clear: () => void;
}

export const usePhotoPostDraft = create<PhotoPostDraft>((set) => ({
  photo: null,
  prompt: '',
  category: null,
  focusAreas: [],
  set: (patch) => set(patch),
  clear: () => set({ photo: null, prompt: '', category: null, focusAreas: [] }),
}));
