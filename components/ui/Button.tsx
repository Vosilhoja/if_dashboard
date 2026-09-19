'use client';

import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
};

const variants = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'bg-surface-2 text-primary hover:bg-surface-2/80',
  danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300',
  success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
  ghost: 'bg-transparent text-secondary hover:bg-surface-2 hover:text-primary',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-[6px] px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
