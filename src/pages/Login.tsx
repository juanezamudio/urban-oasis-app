import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, validatePin } from '../store/authStore';
import { NumericKeypad } from '../components/NumericKeypad';
import { InstallPrompt } from '../components/InstallPrompt';
import logo from '../assets/uop-logo.png';

export function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const navigate = useNavigate();
  const setRole = useAuthStore((state) => state.setRole);

  const handlePinChange = (value: string) => {
    setError('');
    if (value.length <= 4) {
      setPin(value);
      // Auto-submit when 4 digits entered
      if (value.length === 4) {
        setTimeout(() => {
          const role = validatePin(value);
          if (role) {
            setRole(role);
            navigate(role === 'admin' ? '/admin' : '/pos');
          } else {
            setError('Invalid PIN');
            setIsShaking(true);
            setTimeout(() => {
              setIsShaking(false);
              setPin('');
            }, 500);
          }
        }, 100);
      }
    }
  };

  return (
    <div className="h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col items-center justify-center p-8 sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Logo/Header */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 sm:gap-4 bg-gradient-to-b from-stone-700/60 to-stone-800/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-stone-400/40 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <img src={logo} alt="Urban Oasis" className="h-20 sm:h-24" />
              <h1 className="font-display font-bold tracking-tight" style={{ lineHeight: '0.9' }}>
                <span className="block text-xl sm:text-2xl text-stone-50">Harvest</span>
                <span className="block text-xl sm:text-2xl text-emerald-400">
                  Point<span className="text-stone-500 text-xs sm:text-sm align-top ml-0.5">™</span>
                </span>
              </h1>
            </div>
          </div>

          {/* PIN Display */}
          <div
            className={`bg-stone-300 rounded-2xl p-6 border border-stone-400/50 shadow-sm mb-6 ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            <p className="text-sm text-stone-600 text-center mb-4">Enter your PIN to continue</p>
            <div className="flex justify-center gap-4 mb-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pin.length > i ? 'bg-emerald-600 scale-110' : 'bg-stone-400'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-red-600 text-sm text-center mt-3">{error}</p>
            )}
          </div>

          {/* Keypad */}
          <div className="bg-stone-900 rounded-2xl p-4 border border-stone-700">
            <NumericKeypad
              value={pin}
              onChange={handlePinChange}
              allowDecimal={false}
              maxLength={4}
              variant="dark"
            />
          </div>

                  </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>

      <InstallPrompt />
    </div>
  );
}
