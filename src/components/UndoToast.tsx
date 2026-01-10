import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../lib/utils';

interface UndoToastProps {
  isVisible: boolean;
  total: number;
  duration?: number;
  onUndo: () => void;
  onExpire: () => void;
}

export function UndoToast({
  isVisible,
  total,
  duration = 5000,
  onUndo,
  onExpire,
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  const handleUndo = useCallback(() => {
    onUndo();
  }, [onUndo]);

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(duration);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, duration, onExpire]);

  if (!isVisible) return null;

  const progress = timeLeft / duration;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
      <div className="bg-stone-800 rounded-2xl border border-stone-700 shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-400">Order completed</p>
              <p className="font-display text-lg font-bold text-stone-50">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium rounded-xl transition-colors flex-shrink-0"
            >
              Undo
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-stone-700">
          <div
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
