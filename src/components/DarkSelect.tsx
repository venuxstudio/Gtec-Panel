import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface DarkSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function DarkSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  ariaLabel,
  className = '',
}: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setActiveIndex((prev) => Math.min(options.length - 1, prev + 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (open && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        onChange(options[activeIndex].value);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-[#12161D] px-3.5 py-2 text-left text-sm text-white transition-colors hover:border-white/25 focus:border-white/35 focus:outline-none"
      >
        <span className={`truncate ${selectedOption ? 'text-white' : 'text-zinc-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[#0F131A] p-1.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-500">No options available</li>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === activeIndex;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#212834] text-white font-medium'
                        : isHighlighted
                        ? 'bg-[#191F29] text-zinc-100'
                        : 'text-zinc-300 hover:bg-[#191F29] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="block truncate text-[11px] text-zinc-400">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
