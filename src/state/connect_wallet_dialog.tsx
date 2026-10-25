import { create } from "zustand";

/** What the signed-in profile card shows; the app fills it from its own user query. */
export interface DialogProfile {
  name?: string | null;
  image?: string | null;
  coverImage?: string | null;
}

interface DialogModel {
  isOpen: boolean;
  aKeyOpen?: boolean;
  setIsOpen: (mode: boolean, akey?: boolean) => void;
  /** The signed-in user's profile (avatar, cover), or null to fall back to the session. */
  profile: DialogProfile | null;
  setProfile: (profile: DialogProfile | null) => void;
}

export const useDialogStore = create<DialogModel>((set) => ({
  isOpen: false,
  aKeyOpen: false,
  setIsOpen: (mode: boolean, akey?: boolean) =>
    set({ isOpen: mode, aKeyOpen: akey ?? false }),
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
