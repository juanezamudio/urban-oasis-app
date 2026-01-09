import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, validatePin } from '../store/authStore';
import { NumericKeypad } from '../components/NumericKeypad';

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
    <div className="min-h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6">
      <div className="w-full max-w-5xl flex flex-col items-center justify-center p-8 sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl">
        <div className="w-full max-w-sm">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-emerald-400 tracking-tight">Urban</span>
              <span className="text-4xl font-bold text-stone-100 tracking-tight ml-2">Oasis</span>
            </div>
            <p className="text-stone-400 font-medium">Farmers Market POS</p>
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

          {/* Help Text */}
          <p className="text-center text-sm text-stone-500 mt-6">
            Default PINs: Volunteer (1234) | Admin (0000)
          </p>
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
    </div>
  );
}
