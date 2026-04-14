'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme }   = useTheme();

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" aria-hidden="true" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer
                 text-slate-500 hover:text-slate-900 hover:bg-slate-100
                 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800
                 transition-colors duration-150"
    >
      {isDark
        ? <Sun  className="w-4 h-4" aria-hidden="true" />
        : <Moon className="w-4 h-4" aria-hidden="true" />
      }
    </button>
  );
}
