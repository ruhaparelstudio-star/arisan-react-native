import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Ephemeral signup state untuk meneruskan ConfirmationResult & phone antar screen
// (phone -> otp -> consent). JANGAN persist — ConfirmationResult bawa reference
// native yang hanya hidup di memory.
type SignupState = {
  phone: string | null;
  confirmation: FirebaseAuthTypes.ConfirmationResult | null;
  setPhone: (phone: string | null) => void;
  setConfirmation: (c: FirebaseAuthTypes.ConfirmationResult | null) => void;
  reset: () => void;
};

export const useSignupStore = create<SignupState>((set) => ({
  phone: null,
  confirmation: null,
  setPhone: (phone) => set({ phone }),
  setConfirmation: (confirmation) => set({ confirmation }),
  reset: () => set({ phone: null, confirmation: null }),
}));
