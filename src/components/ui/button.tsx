'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 shadow-sm shadow-primary-900/30',
  secondary:
    'bg-surface-700 text-surface-200 hover:bg-surface-600 active:bg-surface-800 border border-surface-600',
  ghost:
    'bg-transparent text-surface-300 hover:bg-surface-800 hover:text-surface-100 active:bg-surface-700',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm shadow-red-900/30',
  outline:
    'bg-transparent text-primary-600 border border-primary-300 hover:bg-primary-50 active:bg-primary-50',
};

/* ── TASTE: Larger hit targets (44px minimum touch target) ── */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-2 rounded-md gap-1.5 min-h-[36px]',
  md: 'text-sm px-4 py-2.5 rounded-lg gap-2 min-h-[44px]',
  lg: 'text-base px-6 py-3 rounded-lg gap-2.5 min-h-[52px]',
};

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'p-2 rounded-md min-h-[36px] min-w-[36px]',
  md: 'p-2.5 rounded-lg min-h-[44px] min-w-[44px]',
  lg: 'p-3 rounded-lg min-h-[52px] min-w-[52px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      loading = false,
      iconOnly = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
          variantStyles[variant],
          iconOnly ? iconOnlySizes[size] : sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {iconOnly ? (
          !loading && !leftIcon && children
        ) : (
          children
        )}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
