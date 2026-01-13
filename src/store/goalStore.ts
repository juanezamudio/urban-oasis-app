import { create } from 'zustand';
import { db, isFirebaseConfigured } from '../lib/firebase';

interface GoalState {
  target: number;
  date: string;
  isLoading: boolean;
  setGoal: (target: number) => Promise<void>;
  clearGoal: () => Promise<void>;
  subscribeToGoal: () => () => void;
  getProgress: (currentTotal: number) => number;
}

const SETTINGS_DOC = 'dailyGoal';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const useGoalStore = create<GoalState>()((set, get) => ({
  target: 0,
  date: '',
  isLoading: false,

  setGoal: async (target: number) => {
    const date = getTodayDateString();
    const goalData = {
      target,
      date,
      updatedAt: new Date(),
    };

    // Update local state immediately
    set({ target, date });

    // Sync to Firebase if configured
    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc, Timestamp } = await import('firebase/firestore');
        const goalRef = doc(db, 'settings', SETTINGS_DOC);
        await setDoc(goalRef, {
          ...goalData,
          updatedAt: Timestamp.fromDate(goalData.updatedAt),
        });
      } catch (error) {
        console.warn('Failed to sync goal to Firebase:', error);
      }
    }
  },

  clearGoal: async () => {
    // Update local state immediately
    set({ target: 0, date: '' });

    // Sync to Firebase if configured
    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc, Timestamp } = await import('firebase/firestore');
        const goalRef = doc(db, 'settings', SETTINGS_DOC);
        await setDoc(goalRef, {
          target: 0,
          date: '',
          updatedAt: Timestamp.fromDate(new Date()),
        });
      } catch (error) {
        console.warn('Failed to clear goal in Firebase:', error);
      }
    }
  },

  subscribeToGoal: () => {
    if (!isFirebaseConfigured || !db) {
      return () => {};
    }

    const connectFirebase = async () => {
      if (!db) return () => {};

      try {
        const { doc, onSnapshot } = await import('firebase/firestore');

        set({ isLoading: true });

        const goalRef = doc(db, 'settings', SETTINGS_DOC);

        const unsubscribe = onSnapshot(
          goalRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Only set goal if it's for today
              const today = getTodayDateString();
              if (data.date === today) {
                set({
                  target: data.target || 0,
                  date: data.date || '',
                  isLoading: false,
                });
              } else {
                // Goal is from a previous day, treat as no goal
                set({
                  target: 0,
                  date: '',
                  isLoading: false,
                });
              }
            } else {
              set({
                target: 0,
                date: '',
                isLoading: false,
              });
            }
          },
          (error) => {
            console.error('Error fetching goal:', error);
            set({ isLoading: false });
          }
        );

        return unsubscribe;
      } catch (error) {
        console.warn('Firebase goal subscription failed');
        set({ isLoading: false });
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
  },

  getProgress: (currentTotal: number) => {
    const { target } = get();
    if (target <= 0) return 0;
    return Math.min(100, Math.round((currentTotal / target) * 100));
  },
}));
