import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private socket: Socket;
  private roomId: string;
  private onRemoteStream: (stream: MediaStream) => void;
  private onStateChange: (state: RTCPeerConnectionState) => void;

  constructor(
    socket: Socket,
    roomId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onStateChange: (state: RTCPeerConnectionState) => void
  ) {
    this.socket = socket;
    this.roomId = roomId;
    this.onRemoteStream = onRemoteStream;
    this.onStateChange = onStateChange;
  }

  /** Direct friend call — uses custom signal callbacks instead of socket room events */
  async initDirect(
    localStream: MediaStream,
    isInitiator: boolean,
    callId: string,
    signals: {
      sendOffer:  (callId: string, offer: RTCSessionDescriptionInit) => void;
      sendAnswer: (callId: string, answer: RTCSessionDescriptionInit) => void;
      sendIce:    (callId: string, candidate: RTCIceCandidateInit) => void;
    }
  ): Promise<void> {
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach(track => this.pc!.addTrack(track, localStream));
    this.pc.ontrack = (e) => { if (e.streams[0]) this.onRemoteStream(e.streams[0]); };
    this.pc.onicecandidate = (e) => { if (e.candidate) signals.sendIce(callId, e.candidate); };
    this.pc.onconnectionstatechange = () => { if (this.pc) this.onStateChange(this.pc.connectionState); };

    if (isInitiator) {
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pc.setLocalDescription(offer);
      signals.sendOffer(callId, offer);
    }
  }

  /** Handle an incoming offer (used by both stranger and direct friend calls) */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    // For direct calls the caller passes a sendAnswer callback; for stranger calls
    // the socket event is emitted via the private handler. This public version is
    // only used by direct calls — caller must send the answer themselves.
    this._pendingAnswer = answer;
  }

  /** Returns the last answer produced by handleOffer (direct call path) */
  getPendingAnswer(): RTCSessionDescriptionInit | null {
    const a = this._pendingAnswer ?? null;
    this._pendingAnswer = null;
    return a;
  }
  private _pendingAnswer: RTCSessionDescriptionInit | null = null;

  /** Handle an incoming answer */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /** Add an ICE candidate */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    try { await this.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
  }

  async init(localStream: MediaStream, isInitiator: boolean): Promise<void> {
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, localStream);
    });

    // Receive remote media
    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // Send local ICE candidates to the signaling server
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          roomId: this.roomId,
          candidate: event.candidate,
        });
      }
    };

    // Track connection state
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.onStateChange(this.pc.connectionState);
      }
    };

    // Set up incoming signaling listeners
    this.socket.on('offer', this._socketOffer);
    this.socket.on('answer', this._socketAnswer);
    this.socket.on('ice-candidate', this.handleIceCandidate);

    // Initiator creates and sends the offer
    if (isInitiator) {
      try {
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await this.pc.setLocalDescription(offer);
        this.socket.emit('offer', { roomId: this.roomId, offer });
      } catch (err) {
        console.error('[WebRTC] Failed to create offer:', err);
      }
    }
  }

  private _socketOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('answer', { roomId: this.roomId, answer });
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
    }
  };

  private _socketAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[WebRTC] Failed to handle answer:', err);
    }
  };

  private handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  };

  close(): void {
    this.socket.off('offer', this._socketOffer);
    this.socket.off('answer', this._socketAnswer);
    this.socket.off('ice-candidate', this.handleIceCandidate);
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
