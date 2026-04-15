'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { getSession } from '@/lib/auth';
import type { Friend, DirectMessage, FriendRequest } from '@/lib/friends';

export interface IncomingCall {
  callId: string;
  from: { id: string; name: string; profilePhoto?: string | null };
}

export interface IncomingFriendRequest {
  requestId: string;
  from: { id: string; name: string; profilePhoto?: string | null };
}

interface UseFriendSocketOptions {
  onFriendRequest?: (req: IncomingFriendRequest) => void;
  onFriendRequestAccepted?: (payload: { by: { id: string; name: string; profilePhoto?: string | null } }) => void;
  onDmReceived?: (msg: DirectMessage & { from: Friend }) => void;
  onCallIncoming?: (call: IncomingCall) => void;
  onCallAccepted?: (payload: { callId: string; isInitiator: boolean }) => void;
  onCallDeclined?: (callId: string) => void;
  onCallEnded?: (callId: string) => void;
  onFriendOnline?: (userId: string) => void;
  onFriendOffline?: (userId: string) => void;
  onFriendOffer?: (payload: { callId: string; offer: RTCSessionDescriptionInit }) => void;
  onFriendAnswer?: (payload: { callId: string; answer: RTCSessionDescriptionInit }) => void;
  onFriendIce?: (payload: { callId: string; candidate: RTCIceCandidateInit }) => void;
}

export function useFriendSocket(opts: UseFriendSocketOptions = {}) {
  const optsRef   = useRef(opts);
  optsRef.current = opts;
  const socketRef = useRef(getSocket());
  const [authenticated, setAuthenticated] = useState(false);

  // Authenticate socket once
  useEffect(() => {
    const socket = socketRef.current;
    const session = getSession();
    if (!session) return;
    socket.emit('authenticate', { userId: session.id, sessionToken: session.sessionToken });
    setAuthenticated(true);
  }, []);

  // Listen for all friend socket events
  useEffect(() => {
    const socket = socketRef.current;

    const onFriendRequest         = (data: IncomingFriendRequest) => optsRef.current.onFriendRequest?.(data);
    const onFriendRequestAccepted = (data: any)                   => optsRef.current.onFriendRequestAccepted?.(data);
    const onDmReceived            = (data: any)                   => optsRef.current.onDmReceived?.(data);
    const onCallIncoming   = (data: IncomingCall)          => optsRef.current.onCallIncoming?.(data);
    const onCallAccepted   = (data: any)                   => optsRef.current.onCallAccepted?.(data);
    const onCallDeclined   = ({ callId }: any)             => optsRef.current.onCallDeclined?.(callId);
    const onCallEnded      = ({ callId }: any)             => optsRef.current.onCallEnded?.(callId);
    const onFriendOnline   = ({ userId }: any)             => optsRef.current.onFriendOnline?.(userId);
    const onFriendOffline  = ({ userId }: any)             => optsRef.current.onFriendOffline?.(userId);
    const onFriendOffer    = (data: any)                   => optsRef.current.onFriendOffer?.(data);
    const onFriendAnswer   = (data: any)                   => optsRef.current.onFriendAnswer?.(data);
    const onFriendIce      = (data: any)                   => optsRef.current.onFriendIce?.(data);

    socket.on('friend-request-received',  onFriendRequest);
    socket.on('friend-request-accepted',  onFriendRequestAccepted);
    socket.on('friend-dm-received',       onDmReceived);
    socket.on('friend-call-incoming',     onCallIncoming);
    socket.on('friend-call-accepted',     onCallAccepted);
    socket.on('friend-call-declined',     onCallDeclined);
    socket.on('friend-call-ended',        onCallEnded);
    socket.on('friend-online',            onFriendOnline);
    socket.on('friend-offline',           onFriendOffline);
    socket.on('friend-offer',             onFriendOffer);
    socket.on('friend-answer',            onFriendAnswer);
    socket.on('friend-ice-candidate',     onFriendIce);

    return () => {
      socket.off('friend-request-received',  onFriendRequest);
    socket.off('friend-request-accepted',  onFriendRequestAccepted);
      socket.off('friend-dm-received',       onDmReceived);
      socket.off('friend-call-incoming',     onCallIncoming);
      socket.off('friend-call-accepted',     onCallAccepted);
      socket.off('friend-call-declined',     onCallDeclined);
      socket.off('friend-call-ended',        onCallEnded);
      socket.off('friend-online',            onFriendOnline);
      socket.off('friend-offline',           onFriendOffline);
      socket.off('friend-offer',             onFriendOffer);
      socket.off('friend-answer',            onFriendAnswer);
      socket.off('friend-ice-candidate',     onFriendIce);
    };
  }, []);

  const sendDm = useCallback((toUserId: string, content: string): Promise<{ id: string; createdAt: number }> => {
    return new Promise((resolve, reject) => {
      socketRef.current.emit('friend-dm', { toUserId, content }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }, []);

  const inviteToCall = useCallback((toUserId: string) => {
    socketRef.current.emit('friend-call-invite', { toUserId });
  }, []);

  const respondToCall = useCallback((callId: string, accept: boolean) => {
    socketRef.current.emit('friend-call-respond', { callId, accept });
  }, []);

  const sendOffer = useCallback((callId: string, offer: RTCSessionDescriptionInit) => {
    socketRef.current.emit('friend-offer', { callId, offer });
  }, []);

  const sendAnswer = useCallback((callId: string, answer: RTCSessionDescriptionInit) => {
    socketRef.current.emit('friend-answer', { callId, answer });
  }, []);

  const sendIce = useCallback((callId: string, candidate: RTCIceCandidateInit) => {
    socketRef.current.emit('friend-ice-candidate', { callId, candidate });
  }, []);

  const endCall = useCallback((callId: string) => {
    socketRef.current.emit('friend-call-end', { callId });
  }, []);

  const sendFriendRequest = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      socketRef.current.emit('send-friend-request', {}, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  return { authenticated, sendDm, inviteToCall, respondToCall, sendOffer, sendAnswer, sendIce, endCall, sendFriendRequest };
}
