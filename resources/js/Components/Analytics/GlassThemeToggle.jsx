import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Glassmorphic Theme Toggle Switch
 * 
 * Provides a frosted-glass slider to toggle between Light and Dark theme modes,
 * handling DOM class updates, local storage persistence, and system preferences.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.currentTheme] - Optional controlled theme state ('dark' | 'light')
 * @param {(theme: string) => void} [props.onThemeChange] - Callback fired on theme change
 */
export const GlassThemeToggle = ({ currentTheme, onThemeChange }) => {
  const [internalTheme, setInternalTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'dark';
  });

  const activeTheme = currentTheme || internalTheme;
  const isDark = activeTheme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (!currentTheme) {
      localStorage.setItem('app-theme', activeTheme);
    }
  }, [activeTheme, currentTheme]);

  const handleToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    if (!currentTheme) {
      setInternalTheme(nextTheme);
    }
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle Glassmorphism Theme"
      className={`
        relative inline-flex h-10 w-20 items-center rounded-full p-1
        transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50
        backdrop-blur-md border border-white/20 dark:border-white/10
        ${isDark 
          ? 'bg-slate-900/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
          : 'bg-white/40 shadow-[0_4px_20px_rgba(255,255,255,0.4)]'}
      `}
    >
      {/* Background Track Icons */}
      <span className="flex w-full items-center justify-between px-1.5 select-none">
        <Sun className={`h-4 w-4 transition-opacity duration-300 ${isDark ? 'text-amber-400 opacity-40' : 'text-amber-500 opacity-100'}`} />
        <Moon className={`h-4 w-4 transition-opacity duration-300 ${isDark ? 'text-purple-300 opacity-100' : 'text-slate-500 opacity-40'}`} />
      </span>

      {/* Sliding Glass Knob with Dynamic Glow */}
      <span
        className={`
          absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full
          backdrop-blur-xl border border-white/40 transition-transform duration-300 ease-out
          ${isDark 
            ? 'translate-x-10 bg-linear-to-br from-purple-500/50 to-indigo-600/70 shadow-[0_0_12px_rgba(184,134,75,0.7)]' 
            : 'translate-x-0 bg-linear-to-br from-amber-300/70 to-orange-400/60 shadow-[0_0_12px_rgba(245,158,11,0.6)]'}
        `}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-purple-100 drop-shadow-[0_0_4px_rgba(184,134,75,0.8)]" />
        ) : (
          <Sun className="h-4 w-4 text-amber-950 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
        )}
      </span>
    </button>
  );
};