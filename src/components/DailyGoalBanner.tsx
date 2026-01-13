import { useEffect, useState } from 'react';
import { useGoalStore } from '../store/goalStore';
import { useOrderStore } from '../store/orderStore';
import { formatCurrency, cn } from '../lib/utils';

export function DailyGoalBanner() {
  const { target, subscribeToGoal, getProgress } = useGoalStore();
  const { getTodayTotal, subscribeToTodaysOrders } = useOrderStore();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasReachedGoal, setHasReachedGoal] = useState(false);

  useEffect(() => {
    const unsubGoal = subscribeToGoal();
    const unsubOrders = subscribeToTodaysOrders();
    return () => {
      unsubGoal();
      unsubOrders();
    };
  }, [subscribeToGoal, subscribeToTodaysOrders]);

  const currentTotal = getTodayTotal();
  const progress = getProgress(currentTotal);
  const goalReached = progress >= 100;

  // Celebrate when goal is first reached
  useEffect(() => {
    if (goalReached && !hasReachedGoal && target > 0) {
      setHasReachedGoal(true);
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [goalReached, hasReachedGoal, target]);

  // Reset celebration flag when goal changes
  useEffect(() => {
    setHasReachedGoal(false);
  }, [target]);

  if (target <= 0) return null;

  return (
    <div className="w-full h-full">
      <div
        className={cn(
          'px-3 py-2 rounded-xl border transition-all relative h-full',
          goalReached
            ? 'bg-emerald-500/20 border-emerald-500/40'
            : 'bg-stone-800/60 border-stone-700/50'
        )}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {goalReached ? (
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className={cn(
              'text-xs font-medium',
              goalReached ? 'text-emerald-300' : 'text-stone-400'
            )}>
              {goalReached ? 'Goal Reached!' : 'Daily Goal'}
            </span>
          </div>
          <span className={cn(
            'text-xs font-medium',
            goalReached ? 'text-emerald-300' : 'text-stone-400'
          )}>
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-stone-700 rounded-full overflow-hidden mb-1.5">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              goalReached ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={cn(
            'text-sm font-semibold',
            goalReached ? 'text-emerald-300' : 'text-stone-200'
          )}>
            {formatCurrency(currentTotal)}
          </span>
          <span className="text-xs text-stone-500">
            of {formatCurrency(target)}
          </span>
        </div>

        {/* Celebration overlay */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="text-4xl animate-bounce">
              🎉
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
