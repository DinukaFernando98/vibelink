const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt   = require('bcryptjs');
const db       = require('./db');

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
/** socketId → { country: string, countryCode: string } */
const userGeo    = new Map();
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

// ── IP geolocation via ip-api.com (free, no key, accurate live data) ─────────
/** @type {Map<string, {code:string, name:string}>} */
const geoCache = new Map();

/** Extract the real client IP from socket handshake, stripping proxy layers */
function getClientIp(socket) {
  const h = socket.handshake.headers;
  const raw = h['x-real-ip'] || h['x-forwarded-for'] || socket.handshake.address || '';
  // x-forwarded-for may be "client, proxy1, proxy2" — take first
  const ip = String(raw).split(',')[0].trim();
  // Strip IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4)
  return ip.replace(/^::ffff:/, '');
}

/** Returns true for loopback / RFC-1918 addresses that cannot be geolocated */
function isPrivateIp(ip) {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/** Look up country for an IP using ip-api.com; results are cached per IP */
async function lookupCountry(ip) {
  if (isPrivateIp(ip)) return { code: 'Unknown', name: 'Unknown' };

  const cached = geoCache.get(ip);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2500);
    const res  = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    const data = await res.json();
    if (data.status === 'success') {
      const result = { code: data.countryCode, name: data.country };
      geoCache.set(ip, result);          // cache indefinitely per session
      return result;
    }
  } catch { /* timeout or network error — fall through */ }

  return { code: 'Unknown', name: 'Unknown' };
}

// ── Connection handler ───────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  const ip = getClientIp(socket);

  if (isRateLimited(ip)) {
    socket.emit('error', { message: 'Too many requests. Please wait a moment.' });
    socket.disconnect(true);
    return;
  }

  // Async geo lookup — Socket.IO queues any events emitted before handlers register
  const geo = await lookupCountry(ip);
  userGeo.set(socket.id, geo);

  console.log(`[+] ${socket.id} connected  (${ip} / ${geo.name})`);

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

      const myGeo      = userGeo.get(socket.id)        || { code: 'Unknown', name: 'Unknown' };
      const partnerGeo = userGeo.get(partner.socketId) || { code: 'Unknown', name: 'Unknown' };

      socket.emit('match-found', {
        roomId,
        isInitiator:      true,
        mode:             safeMode,
        partnerInterests: partner.interests,
        partnerCountry:   partnerGeo,
      });
      io.to(partner.socketId).emit('match-found', {
        roomId,
        isInitiator:      false,
        mode:             safeMode,
        partnerInterests: safeInterests,
        partnerCountry:   myGeo,
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

      // Persist report to database
      db.prepare(
        'INSERT INTO reports (id, reporter_socket, reported_socket, reason, created_at) VALUES (?,?,?,?,?)'
      ).run(uuidv4(), socket.id, partner, reason, Date.now());

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
    userGeo.delete(socket.id);
  });
});

// ── REST middleware ───────────────────────────────────────────────────────────
// In development allow any localhost origin (Next.js can run on any port).
// In production restrict to CLIENT_URL.
const corsOpts = {
  origin: (origin, cb) => {
    const allowed =
      !origin ||                              // same-origin / curl
      origin === CLIENT_URL ||
      /^http:\/\/localhost:\d+$/.test(origin) || // any localhost port
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
    cb(allowed ? null : new Error('CORS'), allowed);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOpts));
app.options('*', cors(corsOpts));            // pre-flight for all routes
app.use(express.json({ limit: '2mb' }));   // profile photos are base64

// ── Admin helpers ─────────────────────────────────────────────────────────────
const ADMIN_USER  = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || '123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN    || 'vibeadmin-7356-secret';

function requireAdmin(req, res, next) {
  const tok = (req.headers.authorization || '').replace('Bearer ', '');
  if (tok !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorised' });
  next();
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, dob, profilePhoto, password } = req.body || {};
  if (!name || !email || !dob || !password)
    return res.status(400).json({ error: 'name, email, dob and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already registered — please sign in.' });

  const id           = uuidv4();
  const token        = uuidv4();
  const now          = Date.now();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO users (id, name, email, dob, profile_photo, session_token, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name.trim(), email.toLowerCase().trim(), dob, profilePhoto || null, token, passwordHash, now);

  return res.json({ user: { id, name: name.trim(), email: email.toLowerCase().trim(), dob, profilePhoto: profilePhoto || null }, sessionToken: token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: 'No account found for this email — please sign up.' });
  if (user.is_banned) return res.status(403).json({ error: 'This account has been banned.' });

  if (!user.password_hash) return res.status(401).json({ error: 'Account has no password set — please sign up again.' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Incorrect password.' });

  const token = uuidv4();
  db.prepare('UPDATE users SET session_token = ?, last_seen = ? WHERE id = ?').run(token, Date.now(), user.id);

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, dob: user.dob, profilePhoto: user.profile_photo },
    sessionToken: token,
  });
});

// Update last_seen via session token (called when user opens chat)
app.post('/api/auth/ping', (req, res) => {
  const { userId, sessionToken } = req.body || {};
  if (!userId || !sessionToken) return res.status(400).json({ error: 'missing fields' });
  const user = db.prepare('SELECT id, is_banned FROM users WHERE id = ? AND session_token = ?').get(userId, sessionToken);
  if (!user) return res.status(401).json({ error: 'Invalid session' });
  if (user.is_banned) return res.status(403).json({ error: 'Banned' });
  db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userId);
  return res.json({ ok: true });
});

// ── Admin auth ────────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS)
    return res.json({ token: ADMIN_TOKEN });
  return res.status(401).json({ error: 'Invalid credentials' });
});

// ── Admin data endpoints ──────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const totalUsers   = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const totalReports = db.prepare('SELECT COUNT(*) as n FROM reports').get().n;
  const bannedUsers  = db.prepare('SELECT COUNT(*) as n FROM users WHERE is_banned = 1').get().n;
  res.json({
    totalUsers, totalReports, bannedUsers,
    activeConnections: io.sockets.sockets.size,
    activeRooms:       rooms.size,
    textQueue:         textQueue.length,
    videoQueue:        videoQueue.length,
    uptime:            Math.floor(process.uptime()),
  });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const offset = (page - 1) * limit;
  const users = db.prepare(
    'SELECT id, name, email, dob, created_at, last_seen, is_banned FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  res.json({ users, total, page, limit });
});

app.get('/api/admin/reports', requireAdmin, (_req, res) => {
  const reports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 200').all();
  res.json({ reports });
});

app.patch('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const { banned } = req.body;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Health check ──────────────────────────────────────────────────────────────
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
