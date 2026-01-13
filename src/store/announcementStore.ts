import { create } from 'zustand';
import { doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { getDeviceId } from '../lib/utils';

export type AnnouncementType = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  message: string;
  type: AnnouncementType;
  createdAt: Date;
  createdBy: string;
}

interface AnnouncementState {
  announcements: Announcement[];
  isLoading: boolean;
  addAnnouncement: (message: string, type: AnnouncementType) => Promise<void>;
  removeAnnouncement: (id: string) => Promise<void>;
  clearAllAnnouncements: () => Promise<void>;
  subscribeToAnnouncements: () => () => void;
}

const SETTINGS_DOC = 'announcements';
export const ANNOUNCEMENT_CHAR_LIMIT = 50;

// Generate a simple unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAnnouncementStore = create<AnnouncementState>()((set, get) => ({
  announcements: [],
  isLoading: false,

  addAnnouncement: async (message: string, type: AnnouncementType) => {
    const newAnnouncement: Announcement = {
      id: generateId(),
      message,
      type,
      createdAt: new Date(),
      createdBy: getDeviceId(),
    };

    // Get current state and build new array BEFORE any async operations
    const currentAnnouncements = get().announcements;
    const updatedAnnouncements = [...currentAnnouncements, newAnnouncement];

    // Update local state immediately
    set({ announcements: updatedAnnouncements });

    // Sync to Firebase if configured
    if (isFirebaseConfigured && db) {
      try {
        const announcementsRef = doc(db, 'settings', SETTINGS_DOC);
        await setDoc(announcementsRef, {
          items: updatedAnnouncements.map((a) => ({
            ...a,
            createdAt: Timestamp.fromDate(a.createdAt),
          })),
          updatedAt: Timestamp.fromDate(new Date()),
          updatedBy: getDeviceId(),
        });
      } catch (error) {
        console.error('Failed to sync announcement to Firebase:', error);
      }
    }
  },

  removeAnnouncement: async (id: string) => {
    // Get current state and build new array BEFORE any async operations
    const currentAnnouncements = get().announcements;
    const updatedAnnouncements = currentAnnouncements.filter((a) => a.id !== id);

    // Update local state immediately
    set({ announcements: updatedAnnouncements });

    // Sync to Firebase if configured
    if (isFirebaseConfigured && db) {
      try {
        const announcementsRef = doc(db, 'settings', SETTINGS_DOC);
        await setDoc(announcementsRef, {
          items: updatedAnnouncements.map((a) => ({
            ...a,
            createdAt: Timestamp.fromDate(a.createdAt),
          })),
          updatedAt: Timestamp.fromDate(new Date()),
          updatedBy: getDeviceId(),
        });
      } catch (error) {
        console.warn('Failed to remove announcement from Firebase:', error);
      }
    }
  },

  clearAllAnnouncements: async () => {
    // Update local state immediately
    set({ announcements: [] });

    // Sync to Firebase if configured
    if (isFirebaseConfigured && db) {
      try {
        const announcementsRef = doc(db, 'settings', SETTINGS_DOC);
        await setDoc(announcementsRef, {
          items: [],
          updatedAt: Timestamp.fromDate(new Date()),
          updatedBy: getDeviceId(),
        });
      } catch (error) {
        console.warn('Failed to clear announcements in Firebase:', error);
      }
    }
  },

  subscribeToAnnouncements: () => {
    if (!isFirebaseConfigured || !db) {
      return () => {};
    }

    set({ isLoading: true });

    const announcementsRef = doc(db, 'settings', SETTINGS_DOC);

    const unsubscribe = onSnapshot(
      announcementsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const items = data.items || [];
          set({
            announcements: items.map((item: { id: string; message: string; type: AnnouncementType; createdAt: { toDate: () => Date }; createdBy: string }) => ({
              id: item.id,
              message: item.message,
              type: item.type,
              createdAt: item.createdAt?.toDate?.() || new Date(),
              createdBy: item.createdBy,
            })),
            isLoading: false,
          });
        } else {
          set({
            announcements: [],
            isLoading: false,
          });
        }
      },
      (error) => {
        console.error('Error fetching announcements:', error);
        set({ isLoading: false });
      }
    );

    return unsubscribe;
  },
}));
