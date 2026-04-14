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
} from '@/lib/types';

interface UseChatOptions {
  mode: ChatMode;
  interests: string[];
}

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

  const webrtcRef          = useRef<WebRTCManager | null>(null);
  const roomIdRef          = useRef<string | null>(null);
  const localStreamRef     = useRef<MediaStream | null>(null);
  const typingTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef      = useRef<number | null>(null);

  // Keep roomIdRef in sync
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const socket = getSocket();

  // ── helpers ─────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    timerStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (timerStartRef.current !== null) {
        setConnectionTime(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerStartRef.current = null;
    setConnectionTime(null);
  }

  function tearDownWebRTC() {
    if (webrtcRef.current) { webrtcRef.current.close(); webrtcRef.current = null; }
    setRemoteStream(null);
  }

  function clearRoom() {
    setRoomId(null);
    roomIdRef.current = null;
    setPartnerInterests([]);
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
    socket.emit('next');
    clearRoom();
    setMessages([]);
    setIsStrangerTyping(false);
    setStatus('searching');

    // Re-join queue immediately (camera stays on for video mode)
    if (mode === 'video') {
      const stream = localStreamRef.current || (await getLocalMedia());
      if (!stream) { setStatus('error'); return; }
    }
    socket.emit('join-queue', { mode, interests });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, mode, interests, getLocalMedia]);

  const sendMessage = useCallback((text: string) => {
    if (!roomIdRef.current || !text.trim()) return;
    const msg: Message = {
      id:        uuidv4(),
      text:      text.trim(),
      sender:    'me',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    socket.emit('chat-message', { roomId: roomIdRef.current, message: msg.text });
  }, [socket]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!roomIdRef.current) return;
    socket.emit('typing', { roomId: roomIdRef.current, isTyping });
  }, [socket]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  const reportUser = useCallback((reason = 'inappropriate') => {
    if (!roomIdRef.current) return;
    socket.emit('report', { roomId: roomIdRef.current, reason });
  }, [socket]);

  // ── socket event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const onMatchFound = async (payload: MatchFoundPayload) => {
      const { roomId: rid, isInitiator, mode: matchMode, partnerInterests: pi } = payload;
      setRoomId(rid);
      roomIdRef.current = rid;
      setStatus('connected');
      setPartnerInterests(pi ?? []);
      startTimer();

      if (matchMode === 'video') {
        const stream = localStreamRef.current || (await getLocalMedia());
        if (!stream) return;

        webrtcRef.current = new WebRTCManager(
          socket,
          rid,
          (rs) => setRemoteStream(rs),
          (state) => {
            if (state === 'failed' || state === 'disconnected') {
              setStatus('disconnected');
            }
          }
        );
        await webrtcRef.current.init(stream, isInitiator);
      }
    };

    const onWaiting            = () => setStatus('searching');

    const onChatMessage        = ({ message, timestamp }: { message: string; timestamp: number }) => {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), text: message, sender: 'stranger', timestamp },
      ]);
    };

    const onTyping             = ({ isTyping }: { isTyping: boolean }) => {
      setIsStrangerTyping(isTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => setIsStrangerTyping(false), 3500);
      }
    };

    const onPartnerDisconnected = () => {
      tearDownWebRTC();
      stopTimer();
      setStatus('disconnected');
    };

    const onReportedSuccess    = () => { clearRoom(); setStatus('searching'); };

    const onError              = ({ message: msg }: { message: string }) => {
      setError(msg);
      setStatus('error');
    };

    const onBanned             = ({ reason }: { reason: string }) => {
      setError(reason);
      setStatus('error');
    };

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
      if (webrtcRef.current) webrtcRef.current.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      // Do NOT stop localStream here so the camera stays on during "Next" flow
    };
  }, []);

  return {
    status, messages, isStrangerTyping, roomId,
    localStream, remoteStream, isMuted, isCameraOff,
    error, connectionTime, partnerInterests,
    startChat, stopChat, nextChat,
    sendMessage, sendTyping,
    toggleMute, toggleCamera, reportUser,
  };
}
