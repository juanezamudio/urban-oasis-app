import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Mobile: bottom sheet, Desktop: centered modal */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'bg-stone-300 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl',
          'transform transition-all animate-slide-up sm:animate-fade-in',
          'border border-stone-400/50 border-b-0 sm:border-b',
          'max-h-[85vh] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col',
          className
        )}
      >
        <div className="overflow-y-auto overscroll-contain flex-1 pb-24 sm:pb-0">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
