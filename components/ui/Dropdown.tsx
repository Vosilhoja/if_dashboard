'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 min-h-10 w-full items-center justify-between gap-2 rounded-[6px] border border-border bg-surface-2 px-3 text-xs text-primary transition-colors hover:border-accent focus-visible:border-accent"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-secondary" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 w-full overflow-y-auto rounded-[6px] border border-border bg-surface p-1 shadow-xl">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex h-10 min-h-10 w-full items-center rounded-[4px] px-3 text-left text-xs transition-colors ${
                option.value === value
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-primary hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
