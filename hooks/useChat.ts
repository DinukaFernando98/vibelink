'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSocket } from '@/lib/socket';
import { WebRTCManager } from '@/lib/webrtc';
import type {
  ChatMode,
  ConnectionStatus,
  MatchFoundPayload,
  Message,
  PartnerCountry,
} from '@/lib/types';

interface UseChatOptions {
  mode: ChatMode;
  interests: string[];
}

// Delay (ms) before auto-searching after partner disconnects
const AUTO_NEXT_DELAY = 2500;

export function useChat({ mode, interests }: UseChatOptions) {
  const [status,           setStatus]          = useState<ConnectionStatus>('idle');
  const [messages,         setMessages]        = useState<Message[]>([]);
  const [isStrangerTyping, setIsStrangerTyping] = useState(false);
  const [roomId,           setRoomId]          = useState<string | null>(null);
  const [localStream,      setLocalStream]     = useState<MediaStream | null>(null);
  const [remoteStream,     setRemoteStream]    = useState<MediaStream | null>(null);
  const [isMuted,          setIsMuted]         = useState(false);
  const [isCameraOff,      setIsCameraOff]     = useState(false);
  const [error,            setError]           = useState<string | null>(null);
  const [connectionTime,   setConnectionTime]  = useState<number | null>(null);
  const [partnerInterests, setPartnerInterests] = useState<string[]>([]);
  const [partnerCountry,   setPartnerCountry]  = useState<PartnerCountry | null>(null);
  const [partnerUserId,    setPartnerUserId]   = useState<string | null>(null);
  // Brief flag so the UI can show "Stranger left — finding next…"
  const [partnerLeft,      setPartnerLeft]     = useState(false);

  const webrtcRef        = useRef<WebRTCManager | null>(null);
  const roomIdRef        = useRef<string | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef    = useRef<number | null>(null);
  const autoNextRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef          = useRef(mode);

  useEffect(() => { roomIdRef.current   = roomId;      }, [roomId]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { modeRef.current     = mode;        }, [mode]);

  // Capture the socket once at mount — never recreate during renders.
  const socketRef = useRef(getSocket());
  const socket    = socketRef.current;

  // ── helpers ──────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    timerStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (timerStartRef.current !== null)
        setConnectionTime(Math.floor((Date.now() - timerStartRef.current) / 1000));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerStartRef.current = null;
    setConnectionTime(null);
  }

  function cancelAutoNext() {
    if (autoNextRef.current) { clearTimeout(autoNextRef.current); autoNextRef.current = null; }
    setPartnerLeft(false);
  }

  function tearDownWebRTC() {
    if (webrtcRef.current) { webrtcRef.current.close(); webrtcRef.current = null; }
    setRemoteStream(null);
  }

  function clearRoom() {
    setRoomId(null);
    roomIdRef.current = null;
    setPartnerInterests([]);
    setPartnerCountry(null);
    setPartnerUserId(null);
    stopTimer();
    tearDownWebRTC();
  }

  // ── media ────────────────────────────────────────────────────────────────────
  const getLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setLocalStream(stream);
      return stream;
    } catch {
      setError('Camera / microphone access denied. Check browser permissions.');
      return null;
    }
  }, []);

  // ── public API ───────────────────────────────────────────────────────────────
  const startChat = useCallback(async () => {
    setError(null);
    setMessages([]);
    setIsStrangerTyping(false);
    setStatus('searching');

    if (mode === 'video') {
      const stream = await getLocalMedia();
      if (!stream) { setStatus('error'); return; }
    }

    socket.emit('join-queue', { mode, interests });
  }, [mode, interests, socket, getLocalMedia]);

  const stopChat = useCallback(() => {
    cancelAutoNext();
    socket.emit('stop');
    clearRoom();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setMessages([]);
    setIsStrangerTyping(false);
    setStatus('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const nextChat = useCallback(async () => {
    cancelAutoNext();
    // If idle, just start fresh without sending 'next' (no room to leave)
    if (status !== 'idle') socket.emit('next');
    clearRoom();
    setMessages([]);
    setIsStrangerTyping(false);
    setStatus('searching');

    if (modeRef.current === 'video') {
      const stream = localStreamRef.current || (await getLocalMedia());
      if (!stream) { setStatus('error'); return; }
    }
    socket.emit('join-queue', { mode: modeRef.current, interests });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, status, interests, getLocalMedia]);

  const sendMessage = useCallback((text: string) => {
    if (!roomIdRef.current || !text.trim()) return;
    const msg: Message = { id: uuidv4(), text: text.trim(), sender: 'me', timestamp: Date.now() };
    setMessages((prev) => [...prev, msg]);
    socket.emit('chat-message', { roomId: roomIdRef.current, message: msg.text });
  }, [socket]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!roomIdRef.current) return;
    socket.emit('typing', { roomId: roomIdRef.current, isTyping });
  }, [socket]);

  const toggleMute = useCallback(() => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsCameraOff(!t.enabled); }
  }, []);

  const reportUser = useCallback((reason = 'inappropriate') => {
    if (!roomIdRef.current) return;
    socket.emit('report', { roomId: roomIdRef.current, reason });
  }, [socket]);

  // ── socket events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMatchFound = async (payload: MatchFoundPayload) => {
      const { roomId: rid, isInitiator, mode: matchMode, partnerInterests: pi, partnerCountry: pc } = payload;
      setRoomId(rid);
      roomIdRef.current = rid;
      setStatus('connected');
      setPartnerInterests(pi ?? []);
      setPartnerCountry(pc ?? null);
      setPartnerUserId(payload.partnerUserId ?? null);
      setPartnerLeft(false);
      startTimer();

      if (matchMode === 'video') {
        const stream = localStreamRef.current || (await getLocalMedia());
        if (!stream) return;
        webrtcRef.current = new WebRTCManager(
          socket, rid,
          (rs)    => setRemoteStream(rs),
          (state) => { if (state === 'failed' || state === 'disconnected') setStatus('disconnected'); }
        );
        await webrtcRef.current.init(stream, isInitiator);
      }
    };

    const onWaiting        = () => setStatus('searching');

    const onChatMessage    = ({ message, timestamp }: { message: string; timestamp: number }) => {
      setMessages((prev) => [...prev, { id: uuidv4(), text: message, sender: 'stranger', timestamp }]);
    };

    const onTyping         = ({ isTyping }: { isTyping: boolean }) => {
      setIsStrangerTyping(isTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping) typingTimeoutRef.current = setTimeout(() => setIsStrangerTyping(false), 3500);
    };

    const onPartnerDisconnected = () => {
      tearDownWebRTC();
      stopTimer();
      setStatus('disconnected');
      setPartnerLeft(true);

      // Auto-search for next stranger after a short delay
      autoNextRef.current = setTimeout(() => {
        setPartnerLeft(false);
        setMessages([]);
        setIsStrangerTyping(false);
        setStatus('searching');
        socket.emit('join-queue', { mode: modeRef.current, interests: [] });
      }, AUTO_NEXT_DELAY);
    };

    const onReportedSuccess = () => { clearRoom(); setStatus('searching'); };
    const onError           = ({ message: msg }: { message: string }) => { setError(msg); setStatus('error'); };
    const onBanned          = ({ reason }: { reason: string })        => { setError(reason); setStatus('error'); };

    socket.on('match-found',          onMatchFound);
    socket.on('waiting',              onWaiting);
    socket.on('chat-message',         onChatMessage);
    socket.on('typing',               onTyping);
    socket.on('partner-disconnected', onPartnerDisconnected);
    socket.on('reported-success',     onReportedSuccess);
    socket.on('error',                onError);
    socket.on('banned',               onBanned);

    return () => {
      socket.off('match-found',          onMatchFound);
      socket.off('waiting',              onWaiting);
      socket.off('chat-message',         onChatMessage);
      socket.off('typing',               onTyping);
      socket.off('partner-disconnected', onPartnerDisconnected);
      socket.off('reported-success',     onReportedSuccess);
      socket.off('error',                onError);
      socket.off('banned',               onBanned);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, getLocalMedia]);

  // ── cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (webrtcRef.current)    webrtcRef.current.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (timerRef.current)     clearInterval(timerRef.current);
      if (autoNextRef.current)  clearTimeout(autoNextRef.current);
    };
  }, []);

  return {
    status, messages, isStrangerTyping, roomId,
    localStream, remoteStream, isMuted, isCameraOff,
    error, connectionTime, partnerInterests, partnerCountry, partnerUserId, partnerLeft,
    startChat, stopChat, nextChat,
    sendMessage, sendTyping, toggleMute, toggleCamera, reportUser,
  };
}
