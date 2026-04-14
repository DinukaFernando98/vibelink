'use client';

import { motion } from 'framer-motion';
import {
  SkipForward,
  Square,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react';
import type { ChatMode, ConnectionStatus } from '@/lib/types';

interface ChatControlsProps {
  mode: ChatMode;
  status: ConnectionStatus;
  isMuted: boolean;
  isCameraOff: boolean;
  onNext: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
}

function ControlButton({
  onClick,
  icon,
  label,
  active = false,
  danger = false,
  primary = false,
  disabled = false,
}: ControlButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl cursor-pointer',
        'transition-all duration-200 min-w-[60px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        primary
          ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25'
          : danger
          ? 'glass text-red-400 hover:bg-red-500/15 hover:border-red-500/30'
          : active
          ? 'bg-white/15 border border-white/20 text-white'
          : 'glass text-slate-300 hover:text-white hover:bg-white/8',
      ].join(' ')}
    >
      <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </motion.button>
  );
}

export function ChatControls({
  mode,
  status,
  isMuted,
  isCameraOff,
  onNext,
  onStop,
  onToggleMute,
  onToggleCamera,
}: ChatControlsProps) {
  const isIdle        = status === 'idle';
  const isSearching   = status === 'searching';
  const isConnected   = status === 'connected';
  const isDisconnected = status === 'disconnected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-center gap-3 px-4 py-4 border-t border-white/5 bg-black/40 backdrop-blur-sm"
      role="toolbar"
      aria-label="Chat controls"
    >
      {/* Video controls (only in video mode) */}
      {mode === 'video' && (
        <>
          <ControlButton
            onClick={onToggleMute}
            icon={isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            label={isMuted ? 'Unmute' : 'Mute'}
            active={isMuted}
            disabled={isIdle}
          />
          <ControlButton
            onClick={onToggleCamera}
            icon={isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            label={isCameraOff ? 'Cam on' : 'Cam off'}
            active={isCameraOff}
            disabled={isIdle}
          />
        </>
      )}

      {/* Next button */}
      <ControlButton
        onClick={onNext}
        icon={<SkipForward className="w-4 h-4" />}
        label="Next"
        primary={isConnected || isDisconnected}
        disabled={isIdle}
      />

      {/* Stop button */}
      <ControlButton
        onClick={onStop}
        icon={<Square className="w-4 h-4" />}
        label="Stop"
        danger
        disabled={isIdle}
      />
    </motion.div>
  );
}
