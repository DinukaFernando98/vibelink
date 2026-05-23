'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Bell, Send, Video, UserMinus,
  Check, User, MessageSquare, Phone, PhoneOff,
  ToggleLeft, ToggleRight, ArrowLeft, Clock, Flag,
} from 'lucide-react';
import { getSession, type UserSession } from '@/lib/auth';
import { toFlag } from '@/lib/countries';
import {
  apiFriends, apiFriendRequests, apiRespondToRequest,
  apiUnfriend, apiFriendMessages, apiToggleActiveStatus, apiFriendReport,
  type Friend, type FriendRequest, type DirectMessage,
} from '@/lib/friends';
import { useFriendSocket, type IncomingCall, type IncomingFriendRequest } from '@/hooks/useFriendSocket';
import { WebRTCManager } from '@/lib/webrtc';
import { getSocket } from '@/lib/socket';
import { VideoCallScreen } from '@/components/video/VideoCallScreen';
import { ReportModal } from '@/components/ui/ReportModal';

type Tab = 'friends' | 'requests';

interface ChatMsg extends DirectMessage {
  optimistic?: boolean;
}

// 60-second call timeout
const CALL_TIMEOUT_MS = 60_000;

export interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFriendRequestReceived?: (req: IncomingFriendRequest) => void;
  onUnreadChange?: (total: number) => void;
}

export function FriendsDrawer({ isOpen, onClose, onFriendRequestReceived, onUnreadChange }: FriendsDrawerProps) {
  const [session,  setSession]  = useState<UserSession | null>(null);

  // Data
  const [friends,  setFriends]  = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  // UI
  const [tab,        setTab]      = useState<Tab>('friends');
  const [selected,   setSelected] = useState<Friend | null>(null);
  const [showChat,   setShowChat] = useState(false);
  const [messages,   setMessages] = useState<ChatMsg[]>([]);
  const [msgInput,   setMsgInput] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [isActive,   setIsActive] = useState(true);

  // Per-friend unread counts
  const [perFriendUnread, setPerFriendUnread] = useState<Record<string, number>>({});
  const perFriendUnreadRef = useRef<Record<string, number>>({});

  // Video call
  const [incomingCall,  setIncomingCall]  = useState<IncomingCall | null>(null);
  const [outgoingCall,  setOutgoingCall]  = useState<Friend | null>(null);
  const [callStatus,    setCallStatus]    = useState<'no-answer' | 'declined' | null>(null);
  const [activeCallId,  setActiveCallId]  = useState<string | null>(null);
  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream,  setRemoteStream]  = useState<MediaStream | null>(null);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isCameraOff,   setIsCameraOff]   = useState(false);

  // Report
  const [reportOpen,    setReportOpen]    = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const webrtcRef      = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef      = useRef(isOpen);
  const selectedRef    = useRef<Friend | null>(null);

  // Queue for offers that arrive before WebRTC is ready
  const pendingOfferRef = useRef<{ callId: string; offer: RTCSessionDescriptionInit } | null>(null);

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    setSession(s);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([apiFriends(), apiFriendRequests()]);
      setFriends(f);
      setRequests(r);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadMessages = useCallback(async (friend: Friend) => {
    setMessages([]);
    setMsgLoading(true);
    try {
      const msgs = await apiFriendMessages(friend.id);
      setMessages(msgs);
    } catch { /* ignore */ } finally { setMsgLoading(false); }
  }, []);

  const selectFriend = useCallback((f: Friend) => {
    setSelected(f);
    setShowChat(true);
    loadMessages(f);
    // Clear this friend's unread count
    setPerFriendUnread(prev => {
      const next = { ...prev, [f.id]: 0 };
      perFriendUnreadRef.current = next;
      const total = (Object.values(next) as number[]).reduce((a, b) => a + b, 0);
      onUnreadChange?.(total);
      return next;
    });
  }, [loadMessages, onUnreadChange]);

  // ── Call helpers ─────────────────────────────────────────────────────────
  const clearCallTimeout = () => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
  };

  const stopCall = useCallback(() => {
    clearCallTimeout();
    webrtcRef.current?.close(); webrtcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null); setRemoteStream(null);
    setActiveCallId(null); setOutgoingCall(null);
    setIsMuted(false); setIsCameraOff(false);
    pendingOfferRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsCameraOff(!t.enabled); }
  }, []);

  // ── Start WebRTC for the accepted call ────────────────────────────────────
  const startCallWebRTC = useCallback(async (callId: string, isInitiator: boolean, signals: {
    sendOffer:  (id: string, o: RTCSessionDescriptionInit) => void;
    sendAnswer: (id: string, a: RTCSessionDescriptionInit) => void;
    sendIce:    (id: string, c: RTCIceCandidateInit) => void;
  }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setActiveCallId(callId);
      const socket = getSocket();
      webrtcRef.current = new WebRTCManager(
        socket, callId,
        (rs) => setRemoteStream(rs),
        (state) => { if (state === 'failed' || state === 'disconnected') stopCall(); },
      );
      await webrtcRef.current.initDirect(stream, isInitiator, callId, signals);

      // Process any queued offer that arrived before WebRTC was ready
      if (!isInitiator && pendingOfferRef.current) {
        const { callId: pid, offer } = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await webrtcRef.current.handleOffer(offer);
        const answer = webrtcRef.current.getPendingAnswer();
        if (answer) signals.sendAnswer(pid, answer);
      }
    } catch { stopCall(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCall]);

  // ── Socket ───────────────────────────────────────────────────────────────
  const { sendDm, inviteToCall, respondToCall, sendOffer, sendAnswer, sendIce, endCall } = useFriendSocket({
    onFriendRequest: (req) => { onFriendRequestReceived?.(req); },

    onDmReceived: (msg) => {
      const myId    = getSession()?.id ?? '';
      const senderId = (msg as any).from?.id ?? msg.from_id ?? (msg as any).fromId ?? '';

      setMessages(prev => {
        const isConversationOpen = selectedRef.current?.id === senderId;
        if (!isConversationOpen) return prev;
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id,
          from_id: senderId,
          to_id:   myId,
          content: msg.content,
          created_at: (msg as any).created_at ?? (msg as any).createdAt ?? Date.now(),
        }];
      });

      // Increment per-friend unread if conversation not currently visible
      const isVisible = isOpenRef.current && selectedRef.current?.id === senderId;
      if (!isVisible && senderId) {
        setPerFriendUnread(prev => {
          const next = { ...prev, [senderId]: (prev[senderId] ?? 0) + 1 };
          perFriendUnreadRef.current = next;
          const total = (Object.values(next) as number[]).reduce((a, b) => a + b, 0);
          onUnreadChange?.(total);
          return next;
        });
      }
    },

    onFriendOnline:  (uid) => setFriends(prev => prev.map(f => f.id === uid ? { ...f, isOnline: true }  : f)),
    onFriendOffline: (uid) => setFriends(prev => prev.map(f => f.id === uid ? { ...f, isOnline: false } : f)),

    onCallIncoming: (call) => setIncomingCall(call),

    onCallDeclined: () => {
      clearCallTimeout();
      setOutgoingCall(null);
      setCallStatus('declined');
      setTimeout(() => setCallStatus(null), 4000);
      stopCall();
    },

    onCallEnded: () => { stopCall(); },

    // Fires for BOTH caller (isInitiator:true) and callee (isInitiator:false)
    onCallAccepted: async ({ callId, isInitiator }) => {
      clearCallTimeout();
      setOutgoingCall(null);
      await startCallWebRTC(callId, isInitiator, { sendOffer, sendAnswer, sendIce });
    },

    onFriendOffer: async ({ callId, offer }) => {
      if (!webrtcRef.current) {
        // WebRTC not ready yet — queue the offer
        pendingOfferRef.current = { callId, offer };
        return;
      }
      await webrtcRef.current.handleOffer(offer);
      const answer = webrtcRef.current.getPendingAnswer();
      if (answer) sendAnswer(callId, answer);
    },
    onFriendAnswer: async ({ answer }) => { await webrtcRef.current?.handleAnswer(answer); },
    onFriendIce:    ({ candidate }) => { webrtcRef.current?.addIceCandidate(candidate); },
  });

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    respondToCall(incomingCall.callId, true);
    setIncomingCall(null);
    // Note: onCallAccepted fires for both sides — WebRTC starts there
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;
    respondToCall(incomingCall.callId, false);
    setIncomingCall(null);
  };

  const handleCallFriend = (f: Friend) => {
    setOutgoingCall(f);
    inviteToCall(f.id);
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      setOutgoingCall(null);
      setCallStatus('no-answer');
      setTimeout(() => setCallStatus(null), 4000);
    }, CALL_TIMEOUT_MS);
  };

  const handleCancelOutgoingCall = () => {
    clearCallTimeout();
    setOutgoingCall(null);
  };

  const handleEndCall = () => {
    if (activeCallId) endCall(activeCallId);
    stopCall();
  };

  // ── DM send ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!selected || !msgInput.trim()) return;
    const content = msgInput.trim();
    setMsgInput('');
    const tempId = `opt-${Date.now()}`;
    const myId   = session?.id ?? '';
    setMessages(prev => [...prev, { id: tempId, from_id: myId, to_id: selected.id, content, created_at: Date.now(), optimistic: true }]);
    try {
      const res = await sendDm(selected.id, content);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.id, created_at: res.createdAt, optimistic: false } : m));
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await apiRespondToRequest(id, accept);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (accept) loadData();
    } catch { /* ignore */ }
  };

  const handleUnfriend = async (f: Friend) => {
    await apiUnfriend(f.id);
    setFriends(prev => prev.filter(x => x.id !== f.id));
    if (selected?.id === f.id) { setSelected(null); setShowChat(false); }
  };

  const handleToggleActive = async () => {
    const next = !isActive;
    setIsActive(next);
    await apiToggleActiveStatus(next);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCallTimeout();
      webrtcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resolve the friend involved in the current call ─────────────────────
  const callFriend = selected ?? friends.find(f => f.id === outgoingCall?.id) ?? null;

  // ── Active call — shared VideoCallScreen (matches public chat video) ──────
  if (activeCallId) {
    return (
      <>
        <VideoCallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          friend={callFriend}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={handleEndCall}
          onReport={callFriend ? () => setReportOpen(true) : undefined}
        />
        {/* Report modal available during a call */}
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          remoteStream={remoteStream}
          chatLog={messages.slice(-30).map(m => `[${m.from_id === session?.id ? 'You' : callFriend?.name ?? 'Friend'}] ${m.content}`)}
          loading={reportLoading}
          onSubmit={async (data) => {
            if (!callFriend) return;
            setReportLoading(true);
            try { await apiFriendReport(callFriend.id, data); }
            catch { /* ignore */ } finally { setReportLoading(false); }
            setReportOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* ── Incoming call — always visible regardless of drawer state ──── */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-3 pointer-events-auto"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
              {incomingCall.from.profilePhoto
                ? <img src={incomingCall.from.profilePhoto} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-violet-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{incomingCall.from.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Incoming video call…</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleAcceptCall} className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center cursor-pointer transition-colors" aria-label="Accept">
                  <Phone className="w-4 h-4 text-white" />
                </button>
                <button onClick={handleDeclineCall} className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center cursor-pointer transition-colors" aria-label="Decline">
                  <PhoneOff className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Outgoing call — always visible ──────────────────────────────── */}
      <AnimatePresence>
        {outgoingCall && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-3 pointer-events-auto"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
              {outgoingCall.profilePhoto
                ? <img src={outgoingCall.profilePhoto} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-violet-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{outgoingCall.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Calling…
                </p>
              </div>
              <button onClick={handleCancelOutgoingCall} className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center cursor-pointer transition-colors shrink-0" aria-label="Cancel">
                <PhoneOff className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Call feedback ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {callStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-3 pointer-events-none"
          >
            <div className="bg-red-50 dark:bg-red-950/90 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 px-4 py-3 flex items-center gap-2">
              {callStatus === 'no-answer' ? <Clock className="w-4 h-4 text-red-500 shrink-0" /> : <PhoneOff className="w-4 h-4 text-red-500 shrink-0" />}
              <p className="text-sm text-red-700 dark:text-red-300">
                {callStatus === 'no-answer' ? 'No answer — call timed out' : 'Call was declined'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-[100] w-full sm:w-[420px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Friends</span>
                {requests.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{requests.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleActive}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-violet-600 transition-colors cursor-pointer"
                  title={isActive ? 'Set invisible' : 'Set active'}
                >
                  {isActive ? <ToggleRight className="w-5 h-5 text-violet-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  <span className="hidden sm:inline text-xs">{isActive ? 'Active' : 'Invisible'}</span>
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body — list or chat */}
            {!showChat ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  {(['friends', 'requests'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {t === 'friends' ? <Users className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      {t === 'friends' ? 'Friends' : 'Requests'}
                      {t === 'requests' && requests.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{requests.length}</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                    </div>
                  ) : tab === 'friends' ? (
                    friends.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No friends yet</p>
                        <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Add friends while chatting with strangers</p>
                      </div>
                    ) : (
                      <ul className="py-1">
                        {friends.map(f => {
                          const unread = perFriendUnread[f.id] ?? 0;
                          return (
                            <li key={f.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selected?.id === f.id && showChat ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}>
                              <button onClick={() => selectFriend(f)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left">
                                <div className="relative shrink-0">
                                  {f.profilePhoto
                                    ? <img src={f.profilePhoto} className="w-9 h-9 rounded-full object-cover" alt="" />
                                    : <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center"><User className="w-4 h-4 text-violet-600" /></div>}
                                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 ${f.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                    {f.name}
                                    {f.countryCode && <span className="text-sm leading-none" aria-label={f.countryName ?? ''}>{toFlag(f.countryCode)}</span>}
                                    {unread > 0 && (
                                      <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                                        {unread > 9 ? '9+' : unread}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                    {f.isOnline && f.is_active ? '🟢 Active now' : f.isOnline ? 'Online' : 'Offline'}
                                  </p>
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => selectFriend(f)} title="Chat"
                                  className="w-7 h-7 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 flex items-center justify-center transition-colors cursor-pointer text-violet-500">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleCallFriend(f)} disabled={!f.isOnline} title={f.isOnline ? 'Video call' : 'Offline'}
                                  className="w-7 h-7 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 flex items-center justify-center transition-colors cursor-pointer text-violet-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                  <Video className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )
                  ) : (
                    requests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No pending requests</p>
                      </div>
                    ) : (
                      <ul className="py-1">
                        {requests.map(r => (
                          <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 dark:border-slate-800/50">
                            {r.from.profilePhoto
                              ? <img src={r.from.profilePhoto} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                              : <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-violet-600" /></div>}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.from.name}</p>
                              <p className="text-[11px] text-slate-400">Friend request</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => handleRespond(r.id, true)} className="w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center cursor-pointer transition-colors" aria-label="Accept">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button onClick={() => handleRespond(r.id, false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer transition-colors" aria-label="Decline">
                                <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </>
            ) : (
              selected && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Chat header */}
                  <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setShowChat(false); setSelected(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                      </button>
                      <div className="relative">
                        {selected.profilePhoto
                          ? <img src={selected.profilePhoto} className="w-8 h-8 rounded-full object-cover" alt="" />
                          : <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center"><User className="w-4 h-4 text-violet-600" /></div>}
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white dark:border-slate-950 ${selected.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                          {selected.name}
                          {selected.countryCode && <span className="text-base leading-none">{toFlag(selected.countryCode)}</span>}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {selected.isOnline && selected.is_active ? '🟢 Active now' : selected.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCallFriend(selected)} disabled={!selected.isOnline}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        <Video className="w-3.5 h-3.5" /><span>Call</span>
                      </button>
                      <button onClick={() => setReportOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Report this user">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleUnfriend(selected)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Unfriend">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                    {msgLoading ? (
                      <div className="flex items-center justify-center h-16">
                        <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center mt-8">
                        <p className="text-xs text-slate-400 dark:text-slate-600">No messages yet. Say hi!</p>
                      </div>
                    ) : (
                      messages.map(m => {
                        const isMe = m.from_id === session?.id;
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'} ${(m as any).optimistic ? 'opacity-70' : ''}`}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-2">
                      <input
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Message…"
                        className="flex-1 h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
                      />
                      <button onClick={handleSend} disabled={!msgInput.trim()}
                        className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer">
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Report modal (friend chat & calls) ────────────────────────── */}
      <ReportModal
        isOpen={reportOpen && !activeCallId}
        onClose={() => setReportOpen(false)}
        remoteStream={null}
        chatLog={messages.slice(-30).map(m => `[${m.from_id === session?.id ? 'You' : selected?.name ?? 'Friend'}] ${m.content}`)}
        loading={reportLoading}
        onSubmit={async (data) => {
          if (!selected) return;
          setReportLoading(true);
          try { await apiFriendReport(selected.id, data); } catch { /* ignore */ }
          finally { setReportLoading(false); }
          setReportOpen(false);
        }}
      />
    </>
  );
}
