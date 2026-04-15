'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { COUNTRIES, toFlag, type Country } from '@/lib/countries';

interface CountryPickerProps {
  value: Country | null;
  onChange: (country: Country | null) => void;
  className?: string;
}

export function CountryPicker({ value, onChange, className = '' }: CountryPickerProps) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = useCallback((c: Country) => {
    onChange(c);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  }, [onChange]);

  const baseCls =
    'w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 transition-colors';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseCls} flex items-center gap-2 cursor-pointer text-left pr-8`}
      >
        {value ? (
          <>
            <span className="text-lg leading-none">{toFlag(value.code)}</span>
            <span className="flex-1 truncate">{value.name}</span>
          </>
        ) : (
          <span className="flex-1 text-slate-400">Select your country</span>
        )}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 cursor-pointer"
              role="button"
              aria-label="Clear"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="flex-1 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-xs text-slate-400 text-center">No countries found</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer ${value?.code === c.code ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="text-base leading-none w-6 text-center">{toFlag(c.code)}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
