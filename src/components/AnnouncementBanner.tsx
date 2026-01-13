import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAnnouncementStore, type AnnouncementType } from '../store/announcementStore';
import { cn } from '../lib/utils';

// Note: Subscription to announcements should be handled by the parent component (POS.tsx)

const typeStyles: Record<AnnouncementType, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-200',
    icon: 'text-blue-400',
  },
  warning: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    text: 'text-amber-200',
    icon: 'text-amber-400',
  },
  urgent: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-200',
    icon: 'text-red-400',
  },
};

const typeIcons: Record<AnnouncementType, ReactNode> = {
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  urgent: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const AUTO_SCROLL_INTERVAL = 3000; // 3 seconds

export function AnnouncementBanner() {
  const { announcements } = useAnnouncementStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset to first announcement when list changes
  useEffect(() => {
    if (currentIndex >= announcements.length) {
      setCurrentIndex(0);
    }
  }, [announcements.length, currentIndex]);

  // Auto-scroll functionality
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];
  if (!currentAnnouncement) return null;

  const styles = typeStyles[currentAnnouncement.type];

  return (
    <div
      className="w-full h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={cn(
          'px-3 py-2 rounded-xl border transition-all duration-300 h-full flex flex-col justify-center',
          styles.bg,
          styles.border
        )}
      >
        {/* Message row */}
        <div className="flex items-center justify-center gap-2">
          {/* Icon */}
          <span className={cn('shrink-0', styles.icon)}>
            {typeIcons[currentAnnouncement.type]}
          </span>

          {/* Message */}
          <p className={cn('text-base font-semibold text-center', styles.text)}>
            {currentAnnouncement.message}
          </p>
        </div>

        {/* Pagination dots below text (only show if multiple announcements) */}
        {announcements.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  index === currentIndex
                    ? 'bg-white/80 w-4'
                    : 'bg-white/30 hover:bg-white/50 w-1.5'
                )}
                aria-label={`Go to announcement ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
