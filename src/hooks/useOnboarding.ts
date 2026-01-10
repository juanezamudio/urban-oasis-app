import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'harvest-point-onboarding';

interface OnboardingState {
  volunteerCompleted: boolean;
  adminCompleted: boolean;
}

export function useOnboarding(role: 'volunteer' | 'admin') {
  const [isActive, setIsActive] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed for this role
    const stored = localStorage.getItem(STORAGE_KEY);
    const state: OnboardingState = stored
      ? JSON.parse(stored)
      : { volunteerCompleted: false, adminCompleted: false };

    const isCompleted = role === 'admin' ? state.adminCompleted : state.volunteerCompleted;

    // If not completed, start the tour after a short delay
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }

    setHasChecked(true);
  }, [role]);

  const completeOnboarding = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const state: OnboardingState = stored
      ? JSON.parse(stored)
      : { volunteerCompleted: false, adminCompleted: false };

    if (role === 'admin') {
      state.adminCompleted = true;
    } else {
      state.volunteerCompleted = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setIsActive(false);
    setHasChecked(true);
  }, [role]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const restartOnboarding = useCallback(() => {
    setIsActive(true);
  }, []);

  return {
    isActive,
    hasChecked,
    completeOnboarding,
    skipOnboarding,
    restartOnboarding,
  };
}
