import { create } from 'zustand';

// Pending invite code — in-memory holder antara deep link tap & user login/consent.
// Tidak dipersist: cold start akan baca ulang dari Linking.getInitialURL().
type PendingInviteState = {
  code: string | null;
  setCode: (code: string | null) => void;
};

export const usePendingInviteStore = create<PendingInviteState>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));
