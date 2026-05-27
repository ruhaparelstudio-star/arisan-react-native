import { create } from 'zustand';
import { signOut } from '@react-native-firebase/auth';
import { auth } from '@/services/firebase';

export type Timezone = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';

export type UserProfile = {
  uid: string;
  phone: string; // +62 format, NEVER show to other members
  nama: string;
  fotoUrl?: string;
  timezone: Timezone;
  consentAt: number; // epoch ms — first-run consent timestamp
};

type AuthState = {
  user: UserProfile | null;
  initializing: boolean;
  setUser: (u: UserProfile | null) => void;
  setInitializing: (v: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
  logout: async () => {
    await signOut(auth());
    set({ user: null });
  },
}));
