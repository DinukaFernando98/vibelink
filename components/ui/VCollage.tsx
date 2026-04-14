'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

/*
  Calligraphic cursive V — defined in a 200×250 unit space then normalised
  to [0-1] for clipPathUnits="objectBoundingBox" so it scales with the
  container's rendered size.

  Shape overview (in original 200×250 space, origin offset x=10, y=30):
    • Left stroke  — thick, outer edge bows far left (like a reversed-C),
                     inner edge is a gentler inward curve
    • Right stroke — thinner, sweeps up-right from the bottom tip
    • Bottom tip   — rounded Q curve
    • Top-left     — pronounced hook/curl (like a real cursive 'v')
*/
const V_CLIP_NORM =
  // ── top of left stroke (the curl/hook) ──────────────────────
  'M 0.15,0.04 ' +
  // outer left edge: hooks hard left at the top, bowls outward, dives to tip
  'C 0,0.04  0,0.36  0.3,0.6 ' +
  'C 0.5,0.76  0.55,0.92  0.55,1 ' +
  // outer tip (rounded)
  'Q 0.575,1.04  0.6,1 ' +
  // right outer stroke: sweeps up-right, thinner
  'C 0.68,0.88  0.82,0.6  0.95,0.12 ' +
  'C 1,0.04  0.9,0  0.8,0.08 ' +
  // right inner stroke: going back down toward tip
  'C 0.72,0.18  0.63,0.44  0.58,0.68 ' +
  // inner tip (rounded)
  'Q 0.56,0.76  0.54,0.76 ' +
  'Q 0.52,0.76  0.51,0.72 ' +
  // left inner edge: returning up toward the hook
  'C 0.46,0.56  0.35,0.36  0.25,0.2 ' +
  'C 0.2,0.12  0.175,0.06  0.15,0.04 Z';

const VIDEO_SRC = '/videos/chat-preview.mp4';

export function VCollage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let tries = 0;
    const tryPlay = async () => {
      try {
        video.muted = true;
        await video.play();
      } catch {
        if (++tries < 10) setTimeout(tryPlay, 200);
      }
    };

    if (video.readyState >= 2) tryPlay();
    else video.oncanplay = tryPlay;
  }, []);

  return (
    <>
      {/* SVG that holds the scalable clip-path definition */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: 'absolute', overflow: 'hidden' }}
      >
        <defs>
          <clipPath id="v-cursive-clip" clipPathUnits="objectBoundingBox">
            <path d={V_CLIP_NORM} />
          </clipPath>
        </defs>
      </svg>

      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
        aria-hidden="true"
        style={{ filter: 'drop-shadow(0px 14px 28px rgba(0,0,0,0.30))' }}
      >
        {/* Container — 55 vh tall, aspect ratio matches V's 200:250 space */}
        <div
          style={{
            height: '55vh',
            aspectRatio: '200 / 250',
            clipPath: 'url(#v-cursive-clip)',
            WebkitClipPath: 'url(#v-cursive-clip)',
            overflow: 'hidden',
            borderRadius: 0,
          }}
        >
          <video
            ref={videoRef}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>

          {/* Subtle inner gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.18) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </motion.div>
    </>
  );
}
