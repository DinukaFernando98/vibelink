'use client';

import { motion } from 'framer-motion';

// ── SVG definitions ────────────────────────────────────────────────────────────

const BEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="#FEF3C7"/>
  <circle cx="50" cy="60" r="30" fill="#92400E"/>
  <circle cx="150" cy="60" r="30" fill="#92400E"/>
  <circle cx="50" cy="60" r="18" fill="#F59E0B"/>
  <circle cx="150" cy="60" r="18" fill="#F59E0B"/>
  <circle cx="100" cy="118" r="74" fill="#D97706"/>
  <ellipse cx="100" cy="143" rx="34" ry="24" fill="#B45309"/>
  <circle cx="75" cy="104" r="11" fill="#1C1917"/>
  <circle cx="78" cy="101" r="4" fill="white"/>
  <circle cx="125" cy="104" r="11" fill="#1C1917"/>
  <circle cx="128" cy="101" r="4" fill="white"/>
  <ellipse cx="100" cy="133" rx="8" ry="6" fill="#1C1917"/>
  <path d="M86 146 Q100 158 114 146" stroke="#1C1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

const FOX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="#FFF7ED"/>
  <polygon points="42,80 20,20 80,52" fill="#EA580C"/>
  <polygon points="158,80 180,20 120,52" fill="#EA580C"/>
  <polygon points="50,72 32,26 76,50" fill="#FED7AA"/>
  <polygon points="150,72 168,26 124,50" fill="#FED7AA"/>
  <circle cx="100" cy="118" r="74" fill="#EA580C"/>
  <ellipse cx="100" cy="148" rx="38" ry="28" fill="#FED7AA"/>
  <circle cx="74" cy="100" r="12" fill="#1C1917"/>
  <circle cx="77" cy="97" r="4.5" fill="white"/>
  <circle cx="126" cy="100" r="12" fill="#1C1917"/>
  <circle cx="129" cy="97" r="4.5" fill="white"/>
  <ellipse cx="100" cy="136" rx="7" ry="5" fill="#9A3412"/>
  <path d="M87 148 Q100 158 113 148" stroke="#9A3412" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

const CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="#EDE9FE"/>
  <polygon points="44,84 28,32 80,64" fill="#7C3AED"/>
  <polygon points="156,84 172,32 120,64" fill="#7C3AED"/>
  <polygon points="50,78 38,40 76,60" fill="#C4B5FD"/>
  <polygon points="150,78 162,40 124,60" fill="#C4B5FD"/>
  <circle cx="100" cy="118" r="74" fill="#7C3AED"/>
  <ellipse cx="100" cy="146" rx="30" ry="20" fill="#5B21B6"/>
  <ellipse cx="74" cy="102" rx="10" ry="12" fill="#1C1917"/>
  <ellipse cx="77" cy="99" rx="3.5" ry="4" fill="white"/>
  <ellipse cx="126" cy="102" rx="10" ry="12" fill="#1C1917"/>
  <ellipse cx="129" cy="99" rx="3.5" ry="4" fill="white"/>
  <ellipse cx="100" cy="136" rx="5" ry="4" fill="#C4B5FD"/>
  <line x1="64" y1="128" x2="90" y2="133" stroke="#C4B5FD" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="64" y1="136" x2="90" y2="136" stroke="#C4B5FD" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="110" y1="133" x2="136" y2="128" stroke="#C4B5FD" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="110" y1="136" x2="136" y2="136" stroke="#C4B5FD" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M88 146 Q100 156 112 146" stroke="#C4B5FD" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

const BUNNY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="#FCE7F3"/>
  <ellipse cx="68" cy="52" rx="18" ry="38" fill="#EC4899"/>
  <ellipse cx="132" cy="52" rx="18" ry="38" fill="#EC4899"/>
  <ellipse cx="68" cy="52" rx="10" ry="28" fill="#FDF2F8"/>
  <ellipse cx="132" cy="52" rx="10" ry="28" fill="#FDF2F8"/>
  <circle cx="100" cy="122" r="72" fill="#F9A8D4"/>
  <circle cx="76" cy="108" r="11" fill="#1C1917"/>
  <circle cx="79" cy="105" r="4" fill="white"/>
  <circle cx="124" cy="108" r="11" fill="#1C1917"/>
  <circle cx="127" cy="105" r="4" fill="white"/>
  <ellipse cx="100" cy="130" rx="7" ry="5" fill="#BE185D"/>
  <path d="M88 140 Q100 152 112 140" stroke="#BE185D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <rect x="92" y="143" width="8" height="10" rx="2" fill="white"/>
  <rect x="101" y="143" width="8" height="10" rx="2" fill="white"/>
</svg>`;

const FROG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="#D1FAE5"/>
  <circle cx="66" cy="62" r="22" fill="#059669"/>
  <circle cx="134" cy="62" r="22" fill="#059669"/>
  <circle cx="66" cy="62" r="14" fill="#1C1917"/>
  <circle cx="69" cy="59" r="5" fill="white"/>
  <circle cx="134" cy="62" r="14" fill="#1C1917"/>
  <circle cx="137" cy="59" r="5" fill="white"/>
  <circle cx="100" cy="122" r="74" fill="#10B981"/>
  <ellipse cx="100" cy="148" rx="40" ry="26" fill="#059669"/>
  <circle cx="88" cy="120" r="5" fill="#059669"/>
  <circle cx="112" cy="120" r="5" fill="#059669"/>
  <path d="M72 148 Q100 168 128 148" stroke="#065F46" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="82" cy="152" r="3" fill="#A7F3D0"/>
  <circle cx="118" cy="152" r="3" fill="#A7F3D0"/>
</svg>`;

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const ANIMAL_AVATARS = [
  { id: 'bear',   label: 'Bear',   dataUrl: toDataUrl(BEAR_SVG) },
  { id: 'fox',    label: 'Fox',    dataUrl: toDataUrl(FOX_SVG) },
  { id: 'cat',    label: 'Cat',    dataUrl: toDataUrl(CAT_SVG) },
  { id: 'bunny',  label: 'Bunny',  dataUrl: toDataUrl(BUNNY_SVG) },
  { id: 'frog',   label: 'Frog',   dataUrl: toDataUrl(FROG_SVG) },
];

interface AnimalPickerProps {
  selected: string | null;
  onSelect: (dataUrl: string | null) => void;
}

export function AnimalPicker({ selected, onSelect }: AnimalPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {ANIMAL_AVATARS.map((animal) => {
        const isSelected = selected === animal.dataUrl;
        return (
          <motion.button
            key={animal.id}
            type="button"
            whileHover={{ y: -3, scale: 1.08 }}
            animate={isSelected ? { y: [0, -5, 0] } : { y: 0 }}
            transition={
              isSelected
                ? { y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } }
                : { duration: 0.2 }
            }
            onClick={() => onSelect(isSelected ? null : animal.dataUrl)}
            aria-label={animal.label}
            aria-pressed={isSelected}
            className={[
              'w-11 h-11 rounded-2xl overflow-hidden shrink-0 transition-shadow cursor-pointer',
              isSelected
                ? 'ring-2 ring-violet-500 ring-offset-2 shadow-lg shadow-violet-200 dark:shadow-violet-900/40'
                : 'ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-violet-300',
            ].join(' ')}
          >
            <img src={animal.dataUrl} alt={animal.label} className="w-full h-full" draggable={false} />
          </motion.button>
        );
      })}
    </div>
  );
}
