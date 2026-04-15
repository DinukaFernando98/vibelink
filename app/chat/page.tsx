'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag, Loader2, Wifi, WifiOff, Zap, UserX } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { VideoPanel } from '@/components/video/VideoPanel';
import { ChatControls } from '@/components/controls/ChatControls';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { ChatMode, ConnectionStatus } from '@/lib/types';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle:         'Ready',
  searching:    'Finding someone…',
  connected:    'Connected',
  disconnected: 'Stranger left',
  error:        'Error',
};

const STATUS_DOT: Record<ConnectionStatus, string> = {
  idle:         'bg-slate-300 dark:bg-slate-600',
  searching:    'bg-amber-400 animate-pulse',
  connected:    'bg-green-500',
  disconnected: 'bg-red-400',
  error:        'bg-red-500',
};

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Convert ISO 3166-1 alpha-2 code → flag emoji (e.g. "IN" → "🇮🇳") */
function toFlag(code: string) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function ChatPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const mode         = (searchParams.get('mode') ?? 'text') as ChatMode;

  const {
    status, messages, isStrangerTyping,
    localStream, remoteStream, isMuted, isCameraOff,
    error, connectionTime, partnerCountry, partnerLeft,
    startChat, stopChat, nextChat,
    sendMessage, sendTyping, toggleMute, toggleCamera, reportUser,
  } = useChat({ mode, interests: [] });

  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; startChat(); }
    return () => { stopChat(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isVideoMode = mode === 'video';

  return (
    <div className="h-[100dvh] bg-white dark:bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { stopChat(); router.push('/'); }}
            aria-label="Back to home"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white hidden sm:block">VibeLink</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{STATUS_LABEL[status]}</span>
            {status === 'connected' && connectionTime !== null && (
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{fmt(connectionTime)}</span>
            )}
            {status === 'connected' && partnerCountry && partnerCountry.name !== 'Unknown' && (
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <span aria-hidden="true">{toFlag(partnerCountry.code)}</span>
                {partnerCountry.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <AnimatePresence>
            {status === 'connected' && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => reportUser()}
                aria-label="Report user"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Report</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Partner-left banner (auto-finding next) ───────────────────── */}
      <AnimatePresence>
        {partnerLeft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/50"
            role="status"
            aria-live="polite"
          >
            <UserX className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Stranger left — finding next person…
            </span>
            <div className="w-3 h-3 rounded-full border border-amber-400 border-t-transparent animate-spin shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 text-center"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className={[
        'flex-1 min-h-0 overflow-hidden',
        isVideoMode ? 'flex flex-col sm:flex-row' : 'flex flex-col',
      ].join(' ')}>

        {/* ── Video pane ───────────────────────────────────────────── */}
        {isVideoMode && (
          <div className="relative bg-slate-900 shrink-0 h-[42vw] max-h-72 sm:max-h-none sm:h-auto sm:flex-1">
            <VideoPanel
              stream={remoteStream}
              label="Stranger"
              status={status}
              className="absolute inset-0 w-full h-full"
            />
            {/* Local PiP */}
            <div className="absolute bottom-2 right-2 z-10
                            w-[22vw] max-w-[80px] aspect-video
                            sm:w-28 sm:max-w-none
                            rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
              <VideoPanel
                stream={localStream}
                muted mirror
                isCameraOff={isCameraOff}
                status="idle"
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* ── Chat pane ────────────────────────────────────────────── */}
        <div className={[
          'flex flex-col min-h-0 bg-white dark:bg-slate-950',
          isVideoMode
            ? 'flex-1 sm:flex-none sm:w-80 border-t border-slate-100 dark:border-slate-800 sm:border-t-0 sm:border-l'
            : 'flex-1',
        ].join(' ')}>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <AnimatePresence mode="wait">
              {status === 'searching' && (
                <motion.div key="searching"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-violet-500 animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Looking for someone…</p>
                </motion.div>
              )}

              {status === 'connected' && messages.length === 0 && !isStrangerTyping && (
                <motion.div key="connected-empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2"
                >
                  <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-500" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Connected — say hello!</p>
                </motion.div>
              )}

              {status === 'disconnected' && !partnerLeft && (
                <motion.div key="disconnected"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-red-400" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Stranger disconnected</p>
                  <button
                    onClick={nextChat}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Find next stranger
                  </button>
                </motion.div>
              )}

              {status === 'idle' && (
                <motion.div key="idle"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3"
                >
                  <p className="text-sm text-slate-400 dark:text-slate-500">Chat ended</p>
                  <button
                    onClick={nextChat}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Start new chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {(messages.length > 0 || isStrangerTyping) && (
              <MessageList messages={messages} isTyping={isStrangerTyping} />
            )}
          </div>

          <div className="shrink-0 px-3 py-2.5 border-t border-slate-100 dark:border-slate-800">
            <ChatInput
              disabled={status !== 'connected'}
              onSend={sendMessage}
              onTyping={sendTyping}
            />
          </div>
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <ChatControls
        mode={mode}
        status={status}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onNext={nextChat}
        onStop={stopChat}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
