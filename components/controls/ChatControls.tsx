'use client';

import { SkipForward, Square, Mic, MicOff, Video, VideoOff } from 'lucide-react';
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

interface BtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

function Btn({ onClick, icon, label, active, primary, danger, disabled }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl cursor-pointer',
        'min-w-[60px] min-h-[56px] transition-colors duration-150 select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
        primary
          ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-sm'
          : danger
          ? 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-500 border border-red-100 dark:border-red-900/50'
          : active
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400',
      ].join(' ')}
    >
      <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export function ChatControls({
  mode, status, isMuted, isCameraOff,
  onNext, onStop, onToggleMute, onToggleCamera,
}: ChatControlsProps) {
  const idle = status === 'idle';
  const isActive = status === 'connected' || status === 'disconnected' || status === 'searching';

  return (
    <div
      className="shrink-0 flex items-center justify-center gap-2.5 px-4 py-3
                 border-t border-slate-100 dark:border-slate-800
                 bg-white dark:bg-slate-950"
      role="toolbar"
      aria-label="Chat controls"
    >
      {mode === 'video' && (
        <>
          <Btn
            onClick={onToggleMute}
            icon={isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            label={isMuted ? 'Unmute' : 'Mute'}
            active={isMuted}
            disabled={idle}
          />
          <Btn
            onClick={onToggleCamera}
            icon={isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            label={isCameraOff ? 'Cam on' : 'Cam off'}
            active={isCameraOff}
            disabled={idle}
          />
        </>
      )}
      {/* Next is always enabled — from idle it starts a new chat */}
      <Btn
        onClick={onNext}
        icon={<SkipForward className="w-4 h-4" />}
        label="Next"
        primary={isActive}
      />
      <Btn
        onClick={onStop}
        icon={<Square className="w-4 h-4" />}
        label="Stop"
        danger
        disabled={idle}
      />
    </div>
  );
}
