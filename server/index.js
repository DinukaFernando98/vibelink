const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors   = require('cors');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── In-memory state ─────────────────────────────────────────────────────────
/** @type {Array<{socketId: string, interests: string[], joinedAt: number}>} */
const textQueue  = [];
/** @type {Array<{socketId: string, interests: string[], joinedAt: number}>} */
const videoQueue = [];
/** @type {Map<string, {users: string[], mode: string, createdAt: number}>} */
const rooms      = new Map();
/** socketId → roomId */
const userRoom   = new Map();
/** socketId → number (report count) */
const reportCount = new Map();
/** ip → {count, window} */
const rateLimits  = new Map();

// ── Rate limiting ────────────────────────────────────────────────────────────
const RATE_LIMIT  = 20;  // max joins per window per IP
const RATE_WINDOW = 60_000;

function isRateLimited(ip) {
  const now  = Date.now();
  const rec  = rateLimits.get(ip) ?? { count: 0, window: now };
  if (now - rec.window > RATE_WINDOW) { rec.count = 1; rec.window = now; }
  else rec.count += 1;
  rateLimits.set(ip, rec);
  return rec.count > RATE_LIMIT;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function removeFromQueues(socketId) {
  const removeFrom = (q) => {
    const idx = q.findIndex((u) => u.socketId === socketId);
    if (idx !== -1) q.splice(idx, 1);
  };
  removeFrom(textQueue);
  removeFrom(videoQueue);
}

function leaveRoom(socket) {
  const roomId = userRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room) {
    room.users.forEach((uid) => {
      if (uid !== socket.id) {
        io.to(uid).emit('partner-disconnected');
      }
    });
    rooms.delete(roomId);
  }
  userRoom.delete(socket.id);
}

function findBestMatch(queue, socketId, interests) {
  // Prefer common interests
  if (interests.length > 0) {
    const idx = queue.findIndex(
      (u) => u.socketId !== socketId && u.interests.some((i) => interests.includes(i))
    );
    if (idx !== -1) return idx;
  }
  // Fall back to any available user
  return queue.findIndex((u) => u.socketId !== socketId);
}

// ── Connection handler ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  if (isRateLimited(ip)) {
    socket.emit('error', { message: 'Too many requests. Please wait a moment.' });
    socket.disconnect(true);
    return;
  }

  console.log(`[+] ${socket.id} connected  (${ip})`);

  // ── join-queue ─────────────────────────────────────────────────────────────
  socket.on('join-queue', ({ mode = 'text', interests = [] }) => {
    // Sanitise
    const safeMode      = mode === 'video' ? 'video' : 'text';
    const safeInterests = interests.slice(0, 10).map((i) => String(i).toLowerCase().trim());

    removeFromQueues(socket.id);
    leaveRoom(socket);

    const queue    = safeMode === 'video' ? videoQueue : textQueue;
    const matchIdx = findBestMatch(queue, socket.id, safeInterests);

    if (matchIdx !== -1) {
      const partner = queue.splice(matchIdx, 1)[0];
      const roomId  = uuidv4();

      rooms.set(roomId, {
        users:     [socket.id, partner.socketId],
        mode:      safeMode,
        createdAt: Date.now(),
      });
      userRoom.set(socket.id,       roomId);
      userRoom.set(partner.socketId, roomId);

      socket.emit('match-found', {
        roomId,
        isInitiator:      true,
        mode:             safeMode,
        partnerInterests: partner.interests,
      });
      io.to(partner.socketId).emit('match-found', {
        roomId,
        isInitiator:      false,
        mode:             safeMode,
        partnerInterests: safeInterests,
      });

      console.log(`[~] Room ${roomId}: ${socket.id} <-> ${partner.socketId}`);
    } else {
      queue.push({ socketId: socket.id, interests: safeInterests, joinedAt: Date.now() });
      socket.emit('waiting');
      console.log(`[Q] ${socket.id} queued for ${safeMode}. Queue size: ${queue.length}`);
    }
  });

  // ── WebRTC signaling ───────────────────────────────────────────────────────
  socket.on('offer', ({ roomId, offer }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const partner = room.users.find((id) => id !== socket.id);
    if (partner) io.to(partner).emit('offer', { offer });
  });

  socket.on('answer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const partner = room.users.find((id) => id !== socket.id);
    if (partner) io.to(partner).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const partner = room.users.find((id) => id !== socket.id);
    if (partner) io.to(partner).emit('ice-candidate', { candidate });
  });

  // ── Chat ───────────────────────────────────────────────────────────────────
  socket.on('chat-message', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const sanitised = String(message).slice(0, 500);
    const partner   = room.users.find((id) => id !== socket.id);
    if (partner) io.to(partner).emit('chat-message', { message: sanitised, timestamp: Date.now() });
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const partner = room.users.find((id) => id !== socket.id);
    if (partner) io.to(partner).emit('typing', { isTyping: Boolean(isTyping) });
  });

  // ── Control ────────────────────────────────────────────────────────────────
  socket.on('next', () => {
    removeFromQueues(socket.id);
    leaveRoom(socket);
  });

  socket.on('stop', () => {
    removeFromQueues(socket.id);
    leaveRoom(socket);
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  socket.on('report', ({ roomId, reason = 'inappropriate' }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const partner = room.users.find((id) => id !== socket.id);
    if (partner) {
      const count = (reportCount.get(partner) ?? 0) + 1;
      reportCount.set(partner, count);
      console.log(`[!] ${partner} reported (x${count}): ${reason}`);

      if (count >= 3) {
        io.to(partner).emit('banned', { reason: 'You have been removed for violating community guidelines.' });
        const ps = io.sockets.sockets.get(partner);
        if (ps) ps.disconnect(true);
      }
    }

    leaveRoom(socket);
    socket.emit('reported-success');
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[-] ${socket.id} disconnected (${reason})`);
    removeFromQueues(socket.id);
    leaveRoom(socket);
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL }));
app.get('/health', (_req, res) => {
  res.json({
    status:      'ok',
    textQueue:   textQueue.length,
    videoQueue:  videoQueue.length,
    activeRooms: rooms.size,
    uptime:      process.uptime(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  VibeLink signaling server  →  http://localhost:${PORT}\n`);
});
