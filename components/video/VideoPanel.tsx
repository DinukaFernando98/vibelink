'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wifi } from 'lucide-react';

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
  stream,
  label,
  muted = false,
  mirror = false,
  status,
  className = '',
  isCameraOff = false,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasStream = !!stream && !isCameraOff;

  return (
    <div className={`relative overflow-hidden bg-[#0a0a0f] ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={[
          'w-full h-full object-cover transition-opacity duration-500',
          mirror ? 'mirror' : '',
          hasStream ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-label={label ? `${label}'s video` : 'Video feed'}
      />

      {/* Placeholder when no stream */}
      <AnimatePresence>
        {!hasStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            {/* Animated ring */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                <User className="w-9 h-9 text-slate-600" aria-hidden="true" />
              </div>
              {status === 'searching' && (
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/40 border-t-violet-500 animate-spin" />
              )}
              {status === 'connected' && (
                <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-glow-pulse" />
              )}
            </div>

            <p className="text-xs text-slate-600">
              {status === 'searching'
                ? 'Connecting…'
                : status === 'disconnected'
                ? 'Stranger left'
                : isCameraOff
                ? 'Camera off'
                : 'Waiting for video…'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label badge */}
      {label && (
        <div className="absolute top-3 left-3 px-2.5 py-1 glass rounded-lg text-xs text-slate-300">
          {label}
        </div>
      )}

      {/* Online indicator */}
      {status === 'connected' && hasStream && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 glass rounded-lg">
          <Wifi className="w-3 h-3 text-green-400" aria-hidden="true" />
          <span className="text-[10px] text-green-400">Live</span>
        </div>
      )}
    </div>
  );
}
