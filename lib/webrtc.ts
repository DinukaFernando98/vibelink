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
    this.socket.on('offer', this.handleOffer);
    this.socket.on('answer', this.handleAnswer);
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

  private handleOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
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

  private handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
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
    this.socket.off('offer', this.handleOffer);
    this.socket.off('answer', this.handleAnswer);
    this.socket.off('ice-candidate', this.handleIceCandidate);
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
