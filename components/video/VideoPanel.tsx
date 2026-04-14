'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from 'lucide-react';

interface VideoPanelProps {
  stream: MediaStream | null;
  label?: string;
  muted?: boolean;
  mirror?: boolean;
  status?: string;
  className?: string;
  isCameraOff?: boolean;
}

export function VideoPanel({
  stream, label, muted = false, mirror = false,
  status, className = '', isCameraOff = false,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      // Ensure play on mobile (required after srcObject assignment)
      el.play().catch(() => {/* autoplay policy — handled by playsInline+muted */});
    }
  }, [stream]);

  const hasVideo = !!stream && !isCameraOff;

  return (
    <div className={`relative overflow-hidden bg-slate-800 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={[
          'w-full h-full object-cover transition-opacity duration-300',
          mirror ? 'mirror' : '',
          hasVideo ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-label={label ? `${label}'s video` : 'Video feed'}
      />

      <AnimatePresence>
        {!hasVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center">
                <User className="w-7 h-7 text-slate-500" aria-hidden="true" />
              </div>
              {status === 'searching' && (
                <div className="absolute inset-0 rounded-full border-2 border-slate-600 border-t-violet-400 animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {status === 'searching' ? 'Connecting…'
               : status === 'disconnected' ? 'Stranger left'
               : isCameraOff ? 'Camera off'
               : 'No video'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {label && hasVideo && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/40 rounded-md text-[10px] text-white/80 backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
}
