'use client';

import { User, Users, MessageSquare, Video } from 'lucide-react';

// Grid dimensions
const COLS = 9;
const ROWS = 8;

// Deterministic values per cell — no Math.random() to avoid hydration mismatch
const OPACITIES  = [0.08, 0.11, 0.07, 0.13, 0.09, 0.06, 0.12, 0.08, 0.10];
const SIZES      = [34, 42, 38, 28, 46, 36, 44, 30, 40];
const BG_LIGHT   = [
  'bg-violet-400', 'bg-slate-400',  'bg-purple-400',
  'bg-indigo-400', 'bg-cyan-400',   'bg-violet-500',
  'bg-slate-500',  'bg-purple-500', 'bg-blue-400',
];
const BG_DARK    = [
  'dark:bg-violet-700', 'dark:bg-slate-600',  'dark:bg-purple-700',
  'dark:bg-indigo-700', 'dark:bg-cyan-700',   'dark:bg-violet-800',
  'dark:bg-slate-700',  'dark:bg-purple-800', 'dark:bg-blue-700',
];
// Cycle through 4 icon types for variety
const ICONS = [User, User, Users, User, MessageSquare, User, Video, User, Users];

export function PeopleGrid() {
  const total = COLS * ROWS;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── Avatar grid ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
          padding: '12px',
          gap: '6px',
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const opacity = OPACITIES[i % OPACITIES.length];
          const size    = SIZES[i % SIZES.length];
          const bgLight = BG_LIGHT[i % BG_LIGHT.length];
          const bgDark  = BG_DARK[i % BG_DARK.length];
          const Icon    = ICONS[i % ICONS.length];
          const iconPx  = Math.round(size * 0.48);

          return (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ opacity }}
            >
              <div
                className={`${bgLight} ${bgDark} rounded-full flex items-center justify-center shrink-0`}
                style={{ width: size, height: size }}
              >
                <Icon
                  className="text-white"
                  style={{ width: iconPx, height: iconPx }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Centre radial vignette — clears the content zone ──── */}
      {/* Light mode: fade to white in centre */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(255,255,255,0.97) 10%, rgba(255,255,255,0.80) 45%, rgba(255,255,255,0.20) 75%, transparent 100%)',
        }}
      />
      {/* Dark mode: fade to slate-950 in centre */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(2,6,23,0.97) 10%, rgba(2,6,23,0.80) 45%, rgba(2,6,23,0.20) 75%, transparent 100%)',
        }}
      />

      {/* ── Edge vignette — soft fade at all four edges ───────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, transparent 18%, transparent 82%, rgba(255,255,255,0.6) 100%),
            linear-gradient(to right,  rgba(255,255,255,0.5) 0%, transparent 15%, transparent 85%, rgba(255,255,255,0.5) 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `
            linear-gradient(to bottom, rgba(2,6,23,0.6) 0%, transparent 18%, transparent 82%, rgba(2,6,23,0.6) 100%),
            linear-gradient(to right,  rgba(2,6,23,0.5) 0%, transparent 15%, transparent 85%, rgba(2,6,23,0.5) 100%)
          `,
        }}
      />
    </div>
  );
}
