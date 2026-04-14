'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag, Loader2, Wifi, WifiOff, Zap } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { VideoPanel } from '@/components/video/VideoPanel';
import { ChatControls } from '@/components/controls/ChatControls';
import type { ChatMode, ConnectionStatus } from '@/lib/types';

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle:         'Ready',
  searching:    'Finding someone…',
  connected:    'Connected',
  disconnected: 'Stranger left',
  error:        'Error',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle:         'bg-slate-500',
  searching:    'bg-amber-400 animate-pulse',
  connected:    'bg-green-400',
  disconnected: 'bg-red-400',
  error:        'bg-red-500',
};

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Inner page (needs Suspense for useSearchParams) ────────────────────────
function ChatPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const mode      = (searchParams.get('mode') ?? 'text') as ChatMode;
  const rawInt    = searchParams.get('interests') ?? '';
  const interests = rawInt ? rawInt.split(',').filter(Boolean) : [];

  const {
    status, messages, isStrangerTyping,
    localStream, remoteStream, isMuted, isCameraOff,
    error, connectionTime, partnerInterests,
    startChat, stopChat, nextChat,
    sendMessage, sendTyping, toggleMute, toggleCamera, reportUser,
  } = useChat({ mode, interests });

  // Auto-start on mount
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startChat();
    }
    return () => { stopChat(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBack() {
    stopChat();
    router.push('/');
  }

  const isVideoMode = mode === 'video';

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/60 backdrop-blur-md z-20">
        {/* Left: back + status */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            aria-label="Back to home"
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-slate-500 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold gradient-text hidden sm:block">VibeLink</span>
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`}
              aria-hidden="true"
            />
            <span className="text-sm text-slate-400">{STATUS_LABEL[status]}</span>
            {status === 'connected' && connectionTime !== null && (
              <span className="text-xs text-slate-600 tabular-nums">
                {formatTimer(connectionTime)}
              </span>
            )}
          </div>
        </div>

        {/* Right: partner interests + report */}
        <div className="flex items-center gap-2">
          {status === 'connected' && partnerInterests.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {partnerInterests.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded-full text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <AnimatePresence>
            {status === 'connected' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                onClick={() => reportUser('inappropriate')}
                aria-label="Report user"
                title="Report this user"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <Flag className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Report</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 text-center"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Video pane (video mode only) */}
        {isVideoMode && (
          <div className="relative flex-1 bg-[#050508]">
            {/* Remote video — full pane */}
            <VideoPanel
              stream={remoteStream}
              label="Stranger"
              status={status}
              className="absolute inset-0 w-full h-full"
            />

            {/* Local video — PiP */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="absolute bottom-4 right-4 z-10 w-32 h-[88px] sm:w-44 sm:h-[110px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 ring-1 ring-white/5"
            >
              <VideoPanel
                stream={localStream}
                muted
                mirror
                isCameraOff={isCameraOff}
                status="idle"
                className="w-full h-full"
              />
              {/* Local label */}
              <div className="absolute bottom-1.5 left-2 text-[9px] text-white/40">You</div>
            </motion.div>
          </div>
        )}

        {/* Chat panel */}
        <div
          className={[
            'flex flex-col bg-[#0a0a0f]',
            isVideoMode
              ? 'w-full sm:w-80 border-l border-white/5'
              : 'flex-1',
          ].join(' ')}
        >
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4">
            <AnimatePresence mode="wait">
              {/* Searching state */}
              {status === 'searching' && (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 py-12"
                >
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border border-white/5 border-t-cyan-500/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300">Finding someone to chat with…</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {interests.length > 0
                        ? `Matching on: ${interests.slice(0, 3).join(', ')}`
                        : 'Looking for anyone online'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Connected but no messages yet */}
              {status === 'connected' && messages.length === 0 && !isStrangerTyping && (
                <motion.div
                  key="connected-empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 py-12"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300">Connected!</p>
                    <p className="text-xs text-slate-600 mt-1">Say hello to break the ice</p>
                  </div>
                </motion.div>
              )}

              {/* Disconnected */}
              {status === 'disconnected' && (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[200px] gap-4 py-12"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300">Stranger disconnected</p>
                    <p className="text-xs text-slate-600 mt-1">Press Next to find someone new</p>
                  </div>
                  <button
                    onClick={nextChat}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm rounded-xl hover:from-violet-500 hover:to-cyan-400 transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  >
                    Find next stranger
                  </button>
                </motion.div>
              )}

              {/* Idle */}
              {status === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center min-h-[200px]"
                >
                  <p className="text-sm text-slate-600">Chat ended</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages + typing indicator */}
            {(messages.length > 0 || isStrangerTyping) && (
              <MessageList messages={messages} isTyping={isStrangerTyping} />
            )}
          </div>

          {/* Chat input */}
          <div className="px-3 pb-2 pt-2 border-t border-white/5 bg-black/20">
            <ChatInput
              disabled={status !== 'connected'}
              onSend={sendMessage}
              onTyping={sendTyping}
            />
          </div>
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────── */}
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

// ── Exported page with Suspense ────────────────────────────────────────────
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" aria-label="Loading" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
