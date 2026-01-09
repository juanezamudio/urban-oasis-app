import { cn } from '../lib/utils';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  allowDecimal?: boolean;
  maxLength?: number;
  variant?: 'light' | 'dark';
}

export function NumericKeypad({
  value,
  onChange,
  allowDecimal = true,
  maxLength = 6,
  variant = 'light',
}: NumericKeypadProps) {
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === 'clear') {
      onChange('');
      return;
    }

    if (key === '.' && !allowDecimal) {
      return;
    }

    if (key === '.' && value.includes('.')) {
      return;
    }

    // Limit decimal places to 2
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1]?.length >= 2) {
        return;
      }
    }

    if (value.length >= maxLength) {
      return;
    }

    // Prevent leading zeros only when entering prices (allowDecimal=true)
    // For PINs (allowDecimal=false), allow leading zeros like "0000"
    if (allowDecimal && value === '0' && key !== '.') {
      onChange(key);
      return;
    }

    onChange(value + key);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  const isDark = variant === 'dark';

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          className={cn(
            'h-14 rounded-xl text-xl font-semibold transition-all active:scale-95',
            key === 'backspace'
              ? isDark
                ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                : 'bg-stone-400 text-stone-700 hover:bg-stone-500'
              : isDark
                ? 'bg-stone-800 text-stone-100 hover:bg-stone-700'
                : 'bg-stone-200 text-stone-800 hover:bg-stone-100 border border-stone-400/50',
            key === '.' && !allowDecimal && 'opacity-50 cursor-not-allowed'
          )}
          disabled={key === '.' && !allowDecimal}
        >
          {key === 'backspace' ? (
            <svg
              className="w-6 h-6 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
              />
            </svg>
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
