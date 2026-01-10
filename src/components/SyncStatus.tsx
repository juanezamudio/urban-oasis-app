import { useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOrderStore } from '../store/orderStore';

export function SyncStatus() {
  const isOnline = useOnlineStatus();
  const { isSyncing, getPendingCount, syncPendingOrders } = useOrderStore();
  const pendingCount = getPendingCount();

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingOrders();
    }
  }, [isOnline, pendingCount, syncPendingOrders]);

  // Don't show anything if online and no pending orders
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline ? (
        // Offline indicator
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-xs font-medium text-amber-400">Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs text-amber-400/70">
              ({pendingCount} pending)
            </span>
          )}
        </div>
      ) : isSyncing ? (
        // Syncing indicator
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
          <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-blue-400">Syncing...</span>
        </div>
      ) : pendingCount > 0 ? (
        // Pending indicator (online but has unsynced orders)
        <button
          onClick={() => syncPendingOrders()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full hover:bg-amber-500/30 transition-colors"
        >
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-xs font-medium text-amber-400">
            {pendingCount} pending
          </span>
          <span className="text-xs text-amber-400/70">Tap to sync</span>
        </button>
      ) : null}
    </div>
  );
}
