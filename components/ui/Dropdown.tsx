'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width: Math.min(width, window.innerWidth - 24),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target) ?? false;
      const clickedPanel = panelRef.current?.contains(target) ?? false;
      if (!clickedButton && !clickedPanel) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 min-h-11 w-full items-center justify-between gap-2 rounded-[6px] border border-border bg-surface-2 px-3 text-xs text-primary transition-colors hover:border-accent focus-visible:border-accent"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-secondary transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[2147483647] max-h-64 overflow-y-auto rounded-[6px] border border-border bg-surface p-1 shadow-xl origin-top animate-[dropdownIn_120ms_ease-out]"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex h-11 min-h-11 w-full items-center rounded-[4px] px-3 text-left text-xs transition-colors ${
                option.value === value
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-primary hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};
