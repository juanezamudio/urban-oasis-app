import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Firebase API keys always start with "AIza"
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey?.startsWith('AIza') &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId.length > 3
);

console.log('Firebase config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyStart: firebaseConfig.apiKey?.substring(0, 4),
  projectId: firebaseConfig.projectId,
  isConfigured: isFirebaseConfigured
});

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
} else {
  console.log('Firebase not configured - running in local-only mode');
}

export { db, isFirebaseConfigured };
export default app;
