'use client';

import { motion } from 'framer-motion';

/*
  Curvy calligraphic V — viewBox "0 0 240 312"
  Each leg bows outward on the outer edge (leftward for left leg,
  rightward for right leg) giving a fluid, swash serif feel.
  Leg width at top ≈ 58 px each. Inner edges are gently concave.
*/
const V_PATH =
  'M 8,4 ' +
  'C -12,95  32,200  106,298 ' +    // left outer — bows left then sweeps to tip
  'Q 120,314 134,298 ' +             // rounded outer tip
  'C 208,200 252,95  232,4  ' +     // right outer — bows right then sweeps up
  'L 174,4  ' +                      // top of right inner leg
  'C 170,78  140,176  126,260 ' +   // right inner edge
  'Q 120,275 114,260 ' +             // rounded inner tip
  'C 100,176  70,78   66,4  ' +     // left inner edge
  'Z';

// Copyright-free Unsplash portraits
const IMG_LEFT  = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=500&fit=crop&crop=faces&auto=format&q=80';
const IMG_RIGHT = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=500&fit=crop&crop=face&auto=format&q=80';

export function VCollage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
      className="flex flex-col items-center select-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 314"
        width="300"
        height="393"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Two people inside a V shape"
      >
        <defs>
          <clipPath id="v-outline">
            <path d={V_PATH} />
          </clipPath>

          {/* Left half — splits the two photos at the midpoint */}
          <clipPath id="v-left-half">
            <rect x="0" y="0" width="120" height="314" />
          </clipPath>

          {/* Right half */}
          <clipPath id="v-right-half">
            <rect x="120" y="0" width="120" height="314" />
          </clipPath>

          {/* Drop shadow filter */}
          <filter id="v-shadow" x="-15%" y="-5%" width="130%" height="115%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="rgba(0,0,0,0.30)" />
          </filter>

          {/* Centre divider gradient */}
          <linearGradient id="divider-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0.65" />
            <stop offset="55%"  stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Drop shadow layer */}
        <path d={V_PATH} fill="rgba(0,0,0,0.15)" filter="url(#v-shadow)" transform="translate(0,5)" />

        {/* Photos clipped to V */}
        <g clipPath="url(#v-outline)">
          <image
            href={IMG_LEFT}
            x="0" y="0"
            width="240" height="314"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#v-left-half)"
          />
          <image
            href={IMG_RIGHT}
            x="0" y="0"
            width="240" height="314"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#v-right-half)"
          />

          {/* Centre divider */}
          <rect x="118.5" y="0" width="3" height="314" fill="url(#divider-fade)" />
        </g>
      </svg>
    </motion.div>
  );
}
