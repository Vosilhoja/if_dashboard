import React from 'react';

export const controlClassName =
  'h-10 min-h-10 rounded-[6px] border border-border bg-surface-2 px-3 text-xs text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`${controlClassName} ${className}`} {...props} />
  ),
);

Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...props }, ref) => (
    <select ref={ref} className={`${controlClassName} ${className}`} {...props} />
  ),
);

Select.displayName = 'Select';
