import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '../types';
import { db, isFirebaseConfigured } from '../lib/firebase';

interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setRole: (role: UserRole) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      hasHydrated: false,
      setRole: (role) => set({ role, isAuthenticated: role !== null }),
      logout: () => set({ role: null, isAuthenticated: false }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'uop-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Default PINs (should be changed via admin panel in production)
const DEFAULT_VOLUNTEER_PIN = '1234';
const DEFAULT_ADMIN_PIN = '0000';

// In-memory cache for PINs (updated by subscription)
let cachedPins: { volunteerPin: string; adminPin: string } = {
  volunteerPin: DEFAULT_VOLUNTEER_PIN,
  adminPin: DEFAULT_ADMIN_PIN,
};

// Load cached PINs from localStorage on startup
const storedConfig = localStorage.getItem('uop-config');
if (storedConfig) {
  try {
    const config = JSON.parse(storedConfig);
    cachedPins = {
      volunteerPin: config.volunteerPin || DEFAULT_VOLUNTEER_PIN,
      adminPin: config.adminPin || DEFAULT_ADMIN_PIN,
    };
  } catch {
    // Use defaults
  }
}

// Subscribe to PIN changes from Firebase
export function subscribeToPins(onUpdate?: (pins: { volunteerPin: string; adminPin: string }) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  const connectFirebase = async () => {
    if (!db) return () => {};

    try {
      const { doc, onSnapshot } = await import('firebase/firestore');

      const configRef = doc(db, 'config', 'pins');

      const unsubscribe = onSnapshot(
        configRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            cachedPins = {
              volunteerPin: data.volunteerPin || DEFAULT_VOLUNTEER_PIN,
              adminPin: data.adminPin || DEFAULT_ADMIN_PIN,
            };
            // Cache to localStorage for offline access
            localStorage.setItem('uop-config', JSON.stringify(cachedPins));
            onUpdate?.(cachedPins);
          }
          // If document doesn't exist, just use localStorage/defaults
        },
        () => {
          // Permission errors are expected if Firebase rules aren't set up for config collection
          // Just use localStorage as fallback - this is not a critical error
          console.log('PIN config using localStorage (Firebase not configured for config collection)');
        }
      );

      return unsubscribe;
    } catch {
      console.log('PIN config using localStorage');
      return () => {};
    }
  };

  let unsubscribe: (() => void) | null = null;
  connectFirebase().then((unsub) => {
    unsubscribe = unsub;
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

export function validatePin(pin: string): UserRole {
  if (pin === cachedPins.adminPin) {
    return 'admin';
  }
  if (pin === cachedPins.volunteerPin) {
    return 'volunteer';
  }
  return null;
}

export async function updatePins(volunteerPin: string, adminPin: string): Promise<void> {
  // Update local cache immediately
  cachedPins = { volunteerPin, adminPin };
  localStorage.setItem('uop-config', JSON.stringify(cachedPins));

  // Try to save to Firebase if configured
  if (isFirebaseConfigured && db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const configRef = doc(db, 'config', 'pins');
      await setDoc(configRef, {
        volunteerPin,
        adminPin,
        updatedAt: new Date(),
      });
    } catch {
      // Firebase save failed (likely permissions) - PINs are still saved locally
      // User would need to update Firebase rules to enable cross-device sync
      console.log('PINs saved locally (Firebase sync requires additional setup)');
    }
  }
}

export function getCurrentPins(): { volunteerPin: string; adminPin: string } {
  return { ...cachedPins };
}
