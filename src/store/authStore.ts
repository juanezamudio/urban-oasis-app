import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '../types';

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

export function validatePin(pin: string): UserRole {
  // Get stored PINs or use defaults
  const storedConfig = localStorage.getItem('uop-config');
  let volunteerPin = DEFAULT_VOLUNTEER_PIN;
  let adminPin = DEFAULT_ADMIN_PIN;

  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      volunteerPin = config.volunteerPin || DEFAULT_VOLUNTEER_PIN;
      adminPin = config.adminPin || DEFAULT_ADMIN_PIN;
    } catch {
      // Use defaults
    }
  }

  if (pin === adminPin) {
    return 'admin';
  }
  if (pin === volunteerPin) {
    return 'volunteer';
  }
  return null;
}

export function updatePins(volunteerPin: string, adminPin: string): void {
  const config = { volunteerPin, adminPin };
  localStorage.setItem('uop-config', JSON.stringify(config));
}

export function getCurrentPins(): { volunteerPin: string; adminPin: string } {
  const storedConfig = localStorage.getItem('uop-config');
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      return {
        volunteerPin: config.volunteerPin || DEFAULT_VOLUNTEER_PIN,
        adminPin: config.adminPin || DEFAULT_ADMIN_PIN,
      };
    } catch {
      // Use defaults
    }
  }
  return { volunteerPin: DEFAULT_VOLUNTEER_PIN, adminPin: DEFAULT_ADMIN_PIN };
}
