import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  // Only create once — socket.io handles reconnection internally.
  // Never check socket.connected here: the socket is in "connecting"
  // state (connected === false) right after creation, and destroying it
  // during that window prevents it from ever establishing a connection.
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
      {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      }
    );
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
