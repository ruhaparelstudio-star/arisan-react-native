import { signInWithPhoneNumber, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { collection, doc, getDoc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { auth, callable, firestore } from './firebase';
import type { Timezone, UserProfile } from '@/stores/auth';

export const PHONE_REGEX = /^\+62\d{8,13}$/;

export const sendOtp = async (phone: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  if (!PHONE_REGEX.test(phone)) {
    throw new Error('Format nomor HP tidak valid');
  }
  // Rate limit check via Cloud Function (throws resource-exhausted jika > 5/jam)
  await callable<{ phone: string }, { ok: true }>('rateLimitOTP')({ phone });
  return signInWithPhoneNumber(auth(), phone);
};

export const verifyOtp = async (
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
): Promise<FirebaseAuthTypes.UserCredential | null> => {
  return confirmation.confirm(code);
};

export const createUserProfile = async (
  uid: string,
  data: { phone: string; nama: string; timezone: Timezone },
): Promise<void> => {
  const ref = doc(collection(firestore(), 'users'), uid);
  await setDoc(ref, {
    phone: data.phone,
    nama: data.nama,
    timezone: data.timezone,
    consentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
};

type UserDoc = {
  phone: string;
  nama: string;
  timezone: Timezone;
  fotoUrl?: string;
  consentAt?: { seconds: number; nanoseconds: number };
};

export const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const ref = doc(collection(firestore(), 'users'), uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<UserDoc> | undefined;
  if (!data?.phone || !data.nama || !data.timezone) return null;
  const consentAt =
    data.consentAt && typeof (data.consentAt as { seconds?: number }).seconds === 'number'
      ? (data.consentAt as { seconds: number }).seconds * 1000
      : Date.now();
  return {
    uid,
    phone: data.phone,
    nama: data.nama,
    timezone: data.timezone,
    fotoUrl: data.fotoUrl,
    consentAt,
  };
};
