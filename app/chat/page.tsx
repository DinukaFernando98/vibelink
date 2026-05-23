'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag, Loader2, Wifi, WifiOff, Zap, UserX, User, LogOut, UserPlus, Users, Columns2, PictureInPicture2, Sparkles } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { VideoPanel } from '@/components/video/VideoPanel';
import { ChatControls } from '@/components/controls/ChatControls';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getSession, clearSession, type UserSession } from '@/lib/auth';
import { useFriendSocket, type IncomingFriendRequest } from '@/hooks/useFriendSocket';
import { FriendRequestToast } from '@/components/friends/FriendRequestToast';
import { FriendsDrawer } from '@/components/friends/FriendsDrawer';
import { ReportModal } from '@/components/ui/ReportModal';
import { apiRespondToRequest, apiCheckFriend } from '@/lib/friends';
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

const VIDEO_FILTERS = [
  // Row 1 — Natural
  { id: 'normal',    label: 'Normal',    style: 'none',                                                             emoji: '😊', group: 'Natural'   },
  { id: 'vivid',     label: 'Vivid',     style: 'saturate(2.5) brightness(1.05)',                                   emoji: '🌈', group: 'Natural'   },
  { id: 'warm',      label: 'Warm',      style: 'sepia(0.3) saturate(1.8) brightness(1.1)',                         emoji: '🌅', group: 'Natural'   },
  { id: 'summer',    label: 'Summer',    style: 'brightness(1.12) saturate(1.6) hue-rotate(15deg)',                 emoji: '☀️', group: 'Natural'   },
  { id: 'sunset',    label: 'Sunset',    style: 'sepia(0.4) saturate(2.2) hue-rotate(340deg) brightness(1.05)',     emoji: '🌇', group: 'Natural'   },
  { id: 'lomo',      label: 'Lomo',      style: 'saturate(1.5) contrast(1.3) brightness(0.9) sepia(0.2)',           emoji: '📸', group: 'Natural'   },
  // Row 2 — Cool tones
  { id: 'cool',      label: 'Cool',      style: 'hue-rotate(190deg) saturate(1.5) brightness(1.05)',                emoji: '❄️', group: 'Cool'      },
  { id: 'ice',       label: 'Ice',       style: 'brightness(1.1) saturate(0.5) hue-rotate(180deg)',                 emoji: '🧊', group: 'Cool'      },
  { id: 'teal',      label: 'Teal',      style: 'hue-rotate(155deg) saturate(1.8) brightness(1.05)',                emoji: '🌊', group: 'Cool'      },
  { id: 'midnight',  label: 'Midnight',  style: 'hue-rotate(220deg) saturate(2) brightness(0.7) contrast(1.3)',     emoji: '🌃', group: 'Cool'      },
  { id: 'matrix',    label: 'Matrix',    style: 'sepia(1) hue-rotate(90deg) saturate(3) brightness(0.72)',          emoji: '💚', group: 'Cool'      },
  { id: 'cyberpunk', label: 'Cyberpunk', style: 'saturate(2.2) hue-rotate(285deg) contrast(1.3) brightness(0.95)', emoji: '🤖', group: 'Cool'      },
  // Row 3 — Vintage & Film
  { id: 'vintage',   label: 'Vintage',   style: 'sepia(0.75) contrast(1.1)',                                        emoji: '📷', group: 'Film'      },
  { id: 'sepia',     label: 'Sepia',     style: 'sepia(1) contrast(1.05)',                                          emoji: '🍂', group: 'Film'      },
  { id: 'fade',      label: 'Fade',      style: 'brightness(1.25) saturate(0.55) contrast(0.88)',                   emoji: '🌫️', group: 'Film'      },
  { id: 'mellow',    label: 'Mellow',    style: 'sepia(0.2) saturate(1.2) brightness(1.08) contrast(0.9)',          emoji: '🌻', group: 'Film'      },
  { id: 'rose',      label: 'Rose',      style: 'sepia(0.4) hue-rotate(310deg) saturate(1.8) brightness(1.05)',     emoji: '🌸', group: 'Film'      },
  { id: 'bw',        label: 'B&W',       style: 'grayscale(1) contrast(1.3)',                                       emoji: '🎞️', group: 'Film'      },
  // Row 4 — Fun / Creative
  { id: 'neon',      label: 'Neon',      style: 'saturate(3) hue-rotate(240deg) contrast(1.2)',                     emoji: '🔮', group: 'Fun'       },
  { id: 'pop',       label: 'Pop Art',   style: 'saturate(4) contrast(1.5)',                                        emoji: '🎨', group: 'Fun'       },
  { id: 'dark',      label: 'Dark',      style: 'brightness(0.58) contrast(1.4) saturate(1.3)',                     emoji: '🌑', group: 'Fun'       },
  { id: 'infrared',  label: 'Infrared',  style: 'invert(1) sepia(1) hue-rotate(110deg) saturate(3)',                emoji: '🔴', group: 'Fun'       },
  { id: 'alien',     label: 'Alien',     style: 'hue-rotate(90deg) saturate(2.2) brightness(0.92)',                 emoji: '👽', group: 'Fun'       },
  { id: 'horror',    label: 'Horror',    style: 'invert(1) grayscale(0.5) contrast(1.4)',                           emoji: '👻', group: 'Fun'       },
];


function ChatPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const mode         = (searchParams.get('mode') ?? 'text') as ChatMode;

  const {
    status, messages, isStrangerTyping,
    localStream, remoteStream, isMuted, isCameraOff,
    error, connectionTime, partnerCountry, partnerUserId, partnerLeft,
    startChat, stopChat, nextChat,
    sendMessage, sendTyping, toggleMute, toggleCamera, reportUser,
  } = useChat({ mode, interests: [] });

  const [session, setSession] = useState<UserSession | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/'); return; }
    setSession(s);
  }, [router]);

  const handleLogout = () => { clearSession(); setSession(null); stopChat(); router.replace('/'); };

  // Friends drawer
  const [friendsOpen,  setFriendsOpen]  = useState(false);
  const [friendsUnread, setFriendsUnread] = useState(0);

  // Friend requests (for in-chat toast — handled by FriendsDrawer callback)
  const [incomingRequest,   setIncomingRequest]   = useState<IncomingFriendRequest | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendRequestError, setFriendRequestError] = useState('');
  const [nowFriends,        setNowFriends]         = useState(false);

  const { sendFriendRequest } = useFriendSocket({
    onFriendRequestAccepted: () => setNowFriends(true),
  });

  const handleSendFriendRequest = async () => {
    setFriendRequestError('');
    try {
      await sendFriendRequest();
      setFriendRequestSent(true);
    } catch (err) {
      setFriendRequestError(err instanceof Error ? err.message : 'Failed to send request.');
      setTimeout(() => setFriendRequestError(''), 3000);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!incomingRequest) return;
    try { await apiRespondToRequest(incomingRequest.requestId, true); } catch { /* ignore */ }
    setIncomingRequest(null);
    setNowFriends(true);
  };

  const handleDeclineFriendRequest = async () => {
    if (!incomingRequest) return;
    try { await apiRespondToRequest(incomingRequest.requestId, false); } catch { /* ignore */ }
    setIncomingRequest(null);
  };

  // When connected, check if partner is already a friend
  useEffect(() => {
    if (status === 'connected' && partnerUserId && session) {
      apiCheckFriend(partnerUserId).then((isFriend) => {
        if (isFriend) setNowFriends(true);
      }).catch(() => {});
    }
    if (status === 'searching') {
      setFriendRequestSent(false);
      setFriendRequestError('');
      setIncomingRequest(null);
      setNowFriends(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, partnerUserId]);

  const [splitView, setSplitView]     = useState(false);
  const [reportOpen, setReportOpen]   = useState(false);
  const [reporting,  setReporting]    = useState(false);
  const [activeFilter, setActiveFilter] = useState('normal');
  const [showFilters,  setShowFilters]  = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

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
      <header className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 z-20 min-h-[56px]">
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
            {status === 'connected' && partnerCountry && partnerCountry.code && !['Unknown','Local',''].includes(partnerCountry.name) && (
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <span aria-hidden="true">{toFlag(partnerCountry.code)}</span>
                {partnerCountry.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {session && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-full pl-1.5 pr-2 py-1 mr-1">
              {session.profilePhoto
                ? <img src={session.profilePhoto} alt="" className="w-5 h-5 rounded-full object-cover" />
                : <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center"><User className="w-3 h-3 text-violet-600" /></div>}
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[80px] truncate hidden sm:block">{session.name}</span>
              <button
                onClick={handleLogout}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          )}
          <ThemeToggle />
          {session && (
            <button
              onClick={() => { setFriendsOpen(true); setFriendsUnread(0); }}
              aria-label="Friends"
              title="Friends"
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              {friendsUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {friendsUnread > 9 ? '9+' : friendsUnread}
                </span>
              )}
            </button>
          )}
          <AnimatePresence>
            {status === 'connected' && (
              <>
                {session && nowFriends && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Friends</span>
                  </motion.span>
                )}
                {session && !nowFriends && !friendRequestSent && (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={handleSendFriendRequest}
                    aria-label="Add friend"
                    title={friendRequestError || 'Add as friend'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${friendRequestError ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/40'}`}
                  >
                    <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{friendRequestError || 'Add Friend'}</span>
                  </motion.button>
                )}
                {session && !nowFriends && friendRequestSent && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-600 dark:text-green-400"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Request sent</span>
                  </motion.span>
                )}
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setReportOpen(true)}
                  aria-label="Report user"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Report</span>
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Incoming friend request toast ──────────────────────────────── */}
      <FriendRequestToast
        request={incomingRequest}
        onAccept={handleAcceptFriendRequest}
        onDecline={handleDeclineFriendRequest}
      />

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
          <div className="relative bg-slate-900 shrink-0 h-[60vw] max-h-[50vh] sm:max-h-none sm:h-auto sm:flex-1">

            {/* ── Layout toggle ─────────────────────────────────────── */}
            <button
              onClick={() => setSplitView(v => !v)}
              title={splitView ? 'Switch to PIP View' : 'Switch to Split View'}
              aria-label={splitView ? 'PIP View' : 'Split View'}
              className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-colors cursor-pointer select-none"
            >
              {splitView
                ? <><PictureInPicture2 className="w-3.5 h-3.5" /><span>PIP View</span></>
                : <><Columns2 className="w-3.5 h-3.5" /><span>Split View</span></>}
            </button>

            {/* ── Face filter picker ────────────────────────────────── */}
            <div className="absolute top-2 right-2 z-20">
              {/* Trigger button */}
              <button
                ref={filterBtnRef}
                onClick={() => setShowFilters(v => !v)}
                title="Face filters"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-colors cursor-pointer select-none ${activeFilter !== 'normal' ? 'bg-violet-600/80 hover:bg-violet-500/80' : 'bg-black/50 hover:bg-black/70'}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {activeFilter !== 'normal'
                    ? (VIDEO_FILTERS.find(f => f.id === activeFilter)?.emoji ?? '✨')
                    : 'Filters'}
                </span>
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full right-0 mt-1.5 w-60 bg-black/85 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-white/10 max-h-[70vh] overflow-y-auto"
                  >
                    {(['Natural', 'Cool', 'Film', 'Fun'] as const).map(group => (
                      <div key={group} className="mb-2">
                        <p className="text-[9px] text-white/35 px-1 pb-1 font-semibold uppercase tracking-widest">{group}</p>
                        <div className="grid grid-cols-6 gap-1">
                          {VIDEO_FILTERS.filter(f => f.group === group).map(f => (
                            <button key={f.id}
                              onClick={() => { setActiveFilter(f.id); setShowFilters(false); }}
                              title={f.label}
                              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl cursor-pointer transition-colors ${activeFilter === f.id ? 'bg-violet-600/70 ring-1 ring-violet-400' : 'hover:bg-white/10'}`}
                            >
                              <span className="text-lg leading-none">{f.emoji}</span>
                              <span className="text-[8px] text-white/60 leading-none truncate w-full text-center">{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {splitView ? (
              /* ── Split view — side by side ────────────────────────── */
              <div className="absolute inset-0 flex">
                <div className="flex-1 relative border-r border-slate-700/50">
                  <VideoPanel stream={remoteStream} label="Stranger" status={status} className="absolute inset-0 w-full h-full" />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full pointer-events-none select-none">Stranger</span>
                </div>
                <div className="flex-1 relative">
                  <VideoPanel
                    stream={localStream} muted mirror isCameraOff={isCameraOff}
                    filterStyle={VIDEO_FILTERS.find(f => f.id === activeFilter)?.style}
                    status="idle" className="absolute inset-0 w-full h-full"
                  />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full pointer-events-none select-none">You</span>
                </div>
              </div>
            ) : (
              /* ── PIP view — remote full-screen, local corner ──────── */
              <>
                <VideoPanel stream={remoteStream} label="Stranger" status={status} className="absolute inset-0 w-full h-full" />
                <div className="absolute bottom-2 right-2 z-10
                                w-[30vw] max-w-[160px] aspect-video
                                sm:w-56 sm:max-w-none
                                rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                  <VideoPanel
                    stream={localStream} muted mirror isCameraOff={isCameraOff}
                    filterStyle={VIDEO_FILTERS.find(f => f.id === activeFilter)?.style}
                    status="idle" className="w-full h-full"
                  />
                </div>
              </>
            )}
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

      {/* ── Report modal ───────────────────────────────────────────────────── */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        remoteStream={remoteStream}
        messages={messages}
        loading={reporting}
        onSubmit={async (data) => {
          setReporting(true);
          reportUser(data);
          setReporting(false);
          setTimeout(() => { setReportOpen(false); nextChat(); }, 1800);
        }}
      />

      {/* ── Friends drawer (handles all friend socket events + notifications) ── */}
      <FriendsDrawer
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onFriendRequestReceived={(req) => setIncomingRequest(req)}
        onUnreadChange={(n) => setFriendsUnread(n)}
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
