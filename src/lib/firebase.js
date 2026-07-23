import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

export const firebaseAuthEnabled = isFirebaseConfigured
  && import.meta.env.VITE_FIREBASE_AUTH_ENABLED === 'true';

// Offline builds remain usable as a demo. Once real authentication is enabled,
// demo role bypass must also be explicitly enabled.
export const demoModeEnabled = !firebaseAuthEnabled
  || import.meta.env.VITE_DEMO_MODE_ENABLED === 'true';

export const firestoreSyncEnabled = firebaseAuthEnabled
  && import.meta.env.VITE_FIRESTORE_SYNC_ENABLED === 'true';

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const functions = firebaseApp ? getFunctions(firebaseApp, 'asia-northeast3') : null;

if (
  firebaseApp
  && import.meta.env.DEV
  && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  && !globalThis.__careerfitFirebaseEmulatorsConnected
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  globalThis.__careerfitFirebaseEmulatorsConnected = true;
}
