import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          {
            'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500':
              variant === 'primary',
            'bg-stone-700 text-stone-100 hover:bg-stone-600 focus:ring-stone-500':
              variant === 'secondary',
            'border-2 border-stone-400 bg-transparent text-stone-700 hover:bg-stone-200 focus:ring-stone-500':
              variant === 'outline',
            'text-stone-200 hover:bg-stone-800 focus:ring-stone-500':
              variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500':
              variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2.5 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
