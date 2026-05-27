import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from '@react-native-firebase/functions';
import crashlytics from '@react-native-firebase/crashlytics';

// Region Jakarta — match Cloud Functions deployment region (PRD §6.1).
export const REGION = 'asia-southeast2';

// Offline persistence — Firestore RN sudah enabled by default di RNFirebase.

export const auth = () => getAuth(getApp());
export const firestore = () => getFirestore(getApp());
export const functions = () => getFunctions(getApp(), REGION);

export const callable = <Req = unknown, Res = unknown>(name: string) =>
  httpsCallable<Req, Res>(functions(), name);

// Emulator switch (dev only). EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true to enable.
if (__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth(), 'http://localhost:9099');
  connectFirestoreEmulator(firestore(), 'localhost', 8080);
  connectFunctionsEmulator(functions(), 'localhost', 5001);
}

export { crashlytics };
