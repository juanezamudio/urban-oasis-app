import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type ActivePage = 'pos' | 'admin';

interface BottomNavProps {
  activePage: ActivePage;
  onSettingsClick: () => void;
  tourTarget?: string;
}

export function BottomNav({ activePage, onSettingsClick, tourTarget }: BottomNavProps) {
  const navigate = useNavigate();
  const { role, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div
        data-tour={tourTarget}
        className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-full px-2 py-2 shadow-2xl"
      >
        {/* Home/POS */}
        <button
          onClick={() => activePage !== 'pos' && navigate('/pos')}
          className={`flex flex-col items-center justify-center w-14 h-10 rounded-full transition-colors ${
            activePage === 'pos'
              ? 'bg-emerald-600 text-white'
              : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>

        {/* Admin - Only show if admin */}
        {role === 'admin' && (
          <button
            onClick={() => activePage !== 'admin' && navigate('/admin')}
            className={`flex flex-col items-center justify-center w-14 h-10 rounded-full transition-colors ${
              activePage === 'admin'
                ? 'bg-emerald-600 text-white'
                : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
