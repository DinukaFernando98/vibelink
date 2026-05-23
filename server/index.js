'use strict';

const express    = require('express');
const { Server } = require('socket.io');
const cors       = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt     = require('bcryptjs');
const geoip      = require('geoip-lite');
const { OAuth2Client } = require('google-auth-library');
const { getCountryName } = require('./countryNames');
const db         = require('./db');

// ── In-memory state ────────────────────────────────────────────────────────
const textQueue   = [];
const videoQueue  = [];
const rooms       = new Map();  // roomId → { users, mode, createdAt }
const userRoom    = new Map();  // socketId → roomId
const userGeo     = new Map();  // socketId → { code, name }
const reportCount = new Map();  // socketId → number
const socketUser  = new Map();  // socketId → userId
const userSockets = new Map();  // userId → Set<socketId>
const directRooms = new Map();  // callId → { users: socketId[] }
const callRoom    = new Map();  // socketId → callId
const rateLimits  = new Map();  // ip → { count, window }

// ── Reported pairs — users who reported each other never match again ───────
// Keyed as `${sortedId1}:${sortedId2}` for bidirectional blocking
const reportedPairs = new Set();

async function loadReportedPairs() {
  try {
    const rows = await db.all(
      'SELECT reporter_user_id, reported_user_id FROM reports WHERE reporter_user_id IS NOT NULL AND reported_user_id IS NOT NULL'
    );
    rows.forEach(({ reporter_user_id, reported_user_id }) => {
      const key = [reporter_user_id, reported_user_id].sort().join(':');
      reportedPairs.add(key);
    });
    console.log(`[init] Loaded ${reportedPairs.size} reported user pairs`);
  } catch { /* ignore — DB may not have the columns yet */ }
}
loadReportedPairs();

// ── Google OAuth ──────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient     = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
// Temp tokens for Google sign-up profile completion (TTL: 10 min)
const googlePending = new Map(); // token → { email, name, picture, expiresAt }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of googlePending) if (v.expiresAt < now) googlePending.delete(k);
}, 300_000);

const RATE_LIMIT  = 20;
const RATE_WINDOW = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  const rec = rateLimits.get(ip) ?? { count: 0, window: now };
  if (now - rec.window > RATE_WINDOW) { rec.count = 1; rec.window = now; }
  else rec.count += 1;
  rateLimits.set(ip, rec);
  return rec.count > RATE_LIMIT;
}

function removeFromQueues(socketId) {
  for (const q of [textQueue, videoQueue]) {
    const i = q.findIndex(u => u.socketId === socketId);
    if (i !== -1) q.splice(i, 1);
  }
}

function leaveRoom(socket, io) {
  const roomId = userRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (room) {
    room.users.forEach(uid => {
      if (uid !== socket.id) io.to(uid).emit('partner-disconnected');
    });
    rooms.delete(roomId);
  }
  userRoom.delete(socket.id);
}

function findBestMatch(queue, socketId, interests, myUserId = null) {
  const eligible = queue.filter(u => {
    if (u.socketId === socketId) return false;
    // Never match users who have reported each other
    if (myUserId) {
      const partnerUserId = socketUser.get(u.socketId);
      if (partnerUserId) {
        const key = [myUserId, partnerUserId].sort().join(':');
        if (reportedPairs.has(key)) return false;
      }
    }
    return true;
  });
  if (interests.length > 0) {
    const match = eligible.find(u => u.interests.some(i => interests.includes(i)));
    if (match) return queue.indexOf(match);
  }
  const first = eligible[0];
  return first ? queue.indexOf(first) : -1;
}

// ── Geo lookup — offline via geoip-lite (no API calls, no rate limits) ────
function getClientIp(socket) {
  const h   = socket.handshake.headers;
  // Support common reverse-proxy headers; take the first (real client) IP
  const raw = h['x-real-ip'] || h['x-forwarded-for'] || socket.handshake.address || '';
  const ip  = String(raw).split(',')[0].trim();
  // Strip IPv6-mapped IPv4: ::ffff:1.2.3.4 → 1.2.3.4
  return ip.replace(/^::ffff:/i, '').trim();
}

function lookupCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    // Local / private — return a friendly label for dev
    return { code: 'LK', name: 'Local' };
  }
  const geo = geoip.lookup(ip);
  if (!geo || !geo.country) return { code: '', name: 'Unknown' };
  return { code: geo.country, name: getCountryName(geo.country) };
}

// ── Admin config ───────────────────────────────────────────────────────────
const ADMIN_USER  = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || '123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN    || 'vibeadmin-7356-secret';

function requireAdmin(req, res, next) {
  const tok = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (tok !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorised' });
  next();
}

async function requireUser(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    const user = await db.get(
      'SELECT id, name, profile_photo, is_active, temp_banned_until FROM users WHERE session_token = ? AND is_banned = 0',
      [token]
    );
    if (!user) return res.status(401).json({ error: 'Unauthorised' });
    if (user.temp_banned_until && user.temp_banned_until > Date.now())
      return res.status(403).json({ error: `Account temporarily restricted. Try again later.` });
    req.user = user;
    next();
  } catch (err) {
    console.error('[requireUser]', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Main export — attach Socket.IO + API to existing http.Server ──────────
function attachSocketAndApi(app, server) {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

  const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── CORS + body parsing ─────────────────────────────────────────────────
  const corsOpts = {
    origin: (origin, cb) => {
      const ok = !origin || origin === CLIENT_URL ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
      cb(ok ? null : new Error('CORS'), ok);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOpts));
  app.options('*', cors(corsOpts));
  app.use(express.json({ limit: '2mb' }));

  // ── Socket.IO ────────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const ip  = getClientIp(socket);
    if (isRateLimited(ip)) {
      socket.emit('error', { message: 'Too many requests. Please wait a moment.' });
      socket.disconnect(true);
      return;
    }
    const geo = lookupCountry(ip);
    userGeo.set(socket.id, geo);

    // join-queue
    socket.on('join-queue', ({ mode = 'text', interests = [] }) => {
      const safeMode      = mode === 'video' ? 'video' : 'text';
      const safeInterests = interests.slice(0, 10).map(i => String(i).toLowerCase().trim());
      removeFromQueues(socket.id);
      leaveRoom(socket, io);

      const queue    = safeMode === 'video' ? videoQueue : textQueue;
      const matchIdx = findBestMatch(queue, socket.id, safeInterests, socketUser.get(socket.id) ?? null);

      if (matchIdx !== -1) {
        const partner = queue.splice(matchIdx, 1)[0];
        const roomId  = uuidv4();
        rooms.set(roomId, { users: [socket.id, partner.socketId], mode: safeMode, createdAt: Date.now() });
        userRoom.set(socket.id, roomId);
        userRoom.set(partner.socketId, roomId);

        const myGeo      = userGeo.get(socket.id)        || { code: 'Unknown', name: 'Unknown' };
        const partnerGeo = userGeo.get(partner.socketId) || { code: 'Unknown', name: 'Unknown' };
        const myUserId      = socketUser.get(socket.id)        ?? null;
        const partnerUserId = socketUser.get(partner.socketId) ?? null;

        socket.emit('match-found', { roomId, isInitiator: true,  mode: safeMode, partnerInterests: partner.interests, partnerCountry: partnerGeo, partnerUserId });
        io.to(partner.socketId).emit('match-found', { roomId, isInitiator: false, mode: safeMode, partnerInterests: safeInterests, partnerCountry: myGeo, partnerUserId: myUserId });
      } else {
        queue.push({ socketId: socket.id, interests: safeInterests, joinedAt: Date.now() });
        socket.emit('waiting');
      }
    });

    // WebRTC signaling
    socket.on('offer',         ({ roomId, offer })      => { const r = rooms.get(roomId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('offer',         { offer }); });
    socket.on('answer',        ({ roomId, answer })     => { const r = rooms.get(roomId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('answer',        { answer }); });
    socket.on('ice-candidate', ({ roomId, candidate })  => { const r = rooms.get(roomId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('ice-candidate', { candidate }); });

    // Chat
    socket.on('chat-message', ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const sanitised = String(message).slice(0, 500);
      const partner   = room.users.find(id => id !== socket.id);
      if (partner) io.to(partner).emit('chat-message', { message: sanitised, timestamp: Date.now() });
    });
    socket.on('typing', ({ roomId, isTyping }) => {
      const room = rooms.get(roomId);
      const partner = room?.users.find(id => id !== socket.id);
      if (partner) io.to(partner).emit('typing', { isTyping: Boolean(isTyping) });
    });

    // Control
    socket.on('next', () => { removeFromQueues(socket.id); leaveRoom(socket, io); });
    socket.on('stop', () => { removeFromQueues(socket.id); leaveRoom(socket, io); });

    // Report — full evidence capture + auto-actions
    socket.on('report', async ({ roomId, category = 'other', description = '', screenshot = null, chatLog = [] } = {}) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const reporterIp       = ip;
      const reporterUserId   = socketUser.get(socket.id) ?? null;
      const partnerSocketId  = room.users.find(id => id !== socket.id);
      const partnerIp        = partnerSocketId ? (userGeo.has(partnerSocketId) ? null : null) : null;
      const reportedUserId   = partnerSocketId ? (socketUser.get(partnerSocketId) ?? null) : null;

      // Rate limit: max 5 reports per hour per socket
      const recentByReporter = await db.get(
        'SELECT COUNT(*) AS n FROM reports WHERE reporter_socket=? AND created_at>?',
        [socket.id, Date.now() - 3_600_000]
      ).catch(() => ({ n: 0 }));
      if (Number(recentByReporter.n) >= 5) {
        socket.emit('error', { message: 'Report limit reached. Please try again later.' });
        return;
      }

      // Store full report
      const reportId    = uuidv4();
      const safeDesc    = String(description || '').slice(0, 1000);
      const safeChat    = Array.isArray(chatLog) ? chatLog.slice(-30) : [];
      const safeShot    = typeof screenshot === 'string' && screenshot.startsWith('data:image/') ? screenshot : null;
      const safeCategory = ['nudity', 'harassment', 'spam', 'underage', 'violence', 'other'].includes(category) ? category : 'other';

      let autoAction = null;

      try {
        // Determine auto-action based on total + recent reports for this user/socket
        if (partnerSocketId) {
          const sessionCount   = (reportCount.get(partnerSocketId) ?? 0) + 1;
          reportCount.set(partnerSocketId, sessionCount);

          if (reportedUserId) {
            const [totalRow, last24hRow] = await Promise.all([
              db.get('SELECT COUNT(*) AS n FROM reports WHERE reported_user_id=?', [reportedUserId]),
              db.get('SELECT COUNT(*) AS n FROM reports WHERE reported_user_id=? AND created_at>?', [reportedUserId, Date.now() - 86_400_000]),
            ]);
            const total  = Number(totalRow?.n ?? 0) + 1;
            const last24 = Number(last24hRow?.n ?? 0) + 1;

            if (total >= 10) {
              // Auto-ban pending admin review
              await db.run('UPDATE users SET is_banned=1, risk_score=risk_score+30 WHERE id=?', [reportedUserId]);
              autoAction = 'auto_banned';
              io.to(partnerSocketId).emit('banned', { reason: 'Your account has been suspended pending review.' });
              io.sockets.sockets.get(partnerSocketId)?.disconnect(true);
            } else if (last24 >= 3) {
              // Temp ban 2 hours
              const until = Date.now() + 2 * 3_600_000;
              await db.run('UPDATE users SET temp_banned_until=?, risk_score=risk_score+15 WHERE id=?', [until, reportedUserId]);
              autoAction = 'temp_banned_2h';
            } else if (total >= 3) {
              // Risk flag
              await db.run('UPDATE users SET risk_score=risk_score+10 WHERE id=?', [reportedUserId]);
              autoAction = 'risk_flagged';
            }
          } else if (sessionCount >= 3) {
            // Unregistered user — disconnect after 3 session reports
            io.to(partnerSocketId).emit('banned', { reason: 'You have been removed for violating community guidelines.' });
            io.sockets.sockets.get(partnerSocketId)?.disconnect(true);
            autoAction = 'session_removed';
          }
        }

        await db.run(
          `INSERT INTO reports
           (id,reporter_socket,reported_socket,reason,reporter_user_id,reported_user_id,category,description,screenshot,chat_log,reporter_ip,auto_action,status,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            reportId,
            socket.id,
            partnerSocketId ?? null,
            safeCategory,
            reporterUserId,
            reportedUserId,
            safeCategory,
            safeDesc || null,
            safeShot,
            safeChat.length ? JSON.stringify(safeChat) : null,
            reporterIp,
            autoAction,
            'pending',
            Date.now(),
          ]
        );
        // Add to in-memory blocked pairs so they never match again
        if (reporterUserId && reportedUserId) {
          reportedPairs.add([reporterUserId, reportedUserId].sort().join(':'));
        }
      } catch (err) { console.error('[report]', err); }

      leaveRoom(socket, io);
      socket.emit('reported-success');
    });

    // Authenticate
    socket.on('authenticate', async ({ userId, sessionToken } = {}) => {
      if (!userId || !sessionToken) return;
      try {
        const user = await db.get('SELECT id FROM users WHERE id=? AND session_token=? AND is_banned=0', [userId, sessionToken]);
        if (!user) return;
        socketUser.set(socket.id, userId);
        const set = userSockets.get(userId) ?? new Set();
        set.add(socket.id);
        userSockets.set(userId, set);
        socket.join(`user:${userId}`);
        const friends = await db.all(
          'SELECT CASE WHEN user_id_1=? THEN user_id_2 ELSE user_id_1 END AS fid FROM friends WHERE user_id_1=? OR user_id_2=?',
          [userId, userId, userId]
        );
        friends.forEach(r => io.to(`user:${r.fid}`).emit('friend-online', { userId }));
      } catch (err) { console.error('[authenticate]', err); }
    });

    // Friend request to stranger
    socket.on('send-friend-request', async (_, callback) => {
      const fromUserId = socketUser.get(socket.id);
      if (!fromUserId) return callback?.({ error: 'You must be logged in.' });
      const roomId = userRoom.get(socket.id);
      if (!roomId) return callback?.({ error: 'Not in a chat.' });
      const room = rooms.get(roomId);
      if (!room) return;
      const toSocketId = room.users.find(id => id !== socket.id);
      if (!toSocketId) return;
      const toUserId = socketUser.get(toSocketId);
      if (!toUserId) return callback?.({ error: 'Stranger is not logged in.' });
      if (toUserId === fromUserId) return;
      try {
        const alreadyFriends = await db.get(
          'SELECT id FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)',
          [fromUserId, toUserId, toUserId, fromUserId]
        );
        if (alreadyFriends) return callback?.({ error: 'You are already friends.' });
        const existing = await db.get(
          "SELECT id FROM friend_requests WHERE from_id=? AND to_id=? AND status='pending'",
          [fromUserId, toUserId]
        );
        if (existing) return callback?.({ error: 'Request already sent.' });
        const reqId    = uuidv4();
        await db.run('INSERT INTO friend_requests (id,from_id,to_id,status,created_at) VALUES (?,?,?,?,?)', [reqId, fromUserId, toUserId, 'pending', Date.now()]);
        const fromUser = await db.get('SELECT name, profile_photo FROM users WHERE id=?', [fromUserId]);
        io.to(toSocketId).emit('friend-request-received', { requestId: reqId, from: { id: fromUserId, name: fromUser.name, profilePhoto: fromUser.profile_photo } });
        callback?.({ ok: true });
      } catch (err) { console.error('[send-friend-request]', err); callback?.({ error: 'Server error.' }); }
    });

    // Direct message
    socket.on('friend-dm', async ({ toUserId, content } = {}, callback) => {
      const fromUserId = socketUser.get(socket.id);
      if (!fromUserId || !toUserId || !content) return;
      try {
        const areFriends = await db.get(
          'SELECT id FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)',
          [fromUserId, toUserId, toUserId, fromUserId]
        );
        if (!areFriends) return callback?.({ error: 'Not friends.' });
        const msgId = uuidv4();
        const now   = Date.now();
        const safe  = String(content).slice(0, 2000);
        await db.run('INSERT INTO direct_messages (id,from_id,to_id,content,created_at) VALUES (?,?,?,?,?)', [msgId, fromUserId, toUserId, safe, now]);
        const fromUser = await db.get('SELECT name, profile_photo FROM users WHERE id=?', [fromUserId]);
        io.to(`user:${toUserId}`).emit('friend-dm-received', { id: msgId, from_id: fromUserId, from: { id: fromUserId, name: fromUser.name, profilePhoto: fromUser.profile_photo }, content: safe, created_at: now });
        callback?.({ ok: true, id: msgId, createdAt: now });
      } catch (err) { console.error('[friend-dm]', err); callback?.({ error: 'Server error.' }); }
    });

    // Friend call
    socket.on('friend-call-invite', async ({ toUserId } = {}) => {
      const fromUserId = socketUser.get(socket.id);
      if (!fromUserId || !toUserId) return;
      try {
        const areFriends = await db.get(
          'SELECT id FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)',
          [fromUserId, toUserId, toUserId, fromUserId]
        );
        if (!areFriends) return;
        const callId   = uuidv4();
        const fromUser = await db.get('SELECT name, profile_photo FROM users WHERE id=?', [fromUserId]);
        directRooms.set(callId, { users: [socket.id] });
        callRoom.set(socket.id, callId);
        io.to(`user:${toUserId}`).emit('friend-call-incoming', { callId, from: { id: fromUserId, name: fromUser.name, profilePhoto: fromUser.profile_photo } });
      } catch (err) { console.error('[friend-call-invite]', err); }
    });

    socket.on('friend-call-respond', ({ callId, accept } = {}) => {
      const room = directRooms.get(callId);
      if (!room) return;
      const callerSocketId = room.users[0];
      if (accept) {
        room.users.push(socket.id);
        callRoom.set(socket.id, callId);
        io.to(callerSocketId).emit('friend-call-accepted', { callId, isInitiator: true });
        socket.emit('friend-call-accepted', { callId, isInitiator: false });
      } else {
        directRooms.delete(callId);
        callRoom.delete(callerSocketId);
        io.to(callerSocketId).emit('friend-call-declined', { callId });
      }
    });

    socket.on('friend-offer',         ({ callId, offer })      => { const r = directRooms.get(callId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('friend-offer',         { callId, offer }); });
    socket.on('friend-answer',        ({ callId, answer })     => { const r = directRooms.get(callId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('friend-answer',        { callId, answer }); });
    socket.on('friend-ice-candidate', ({ callId, candidate })  => { const r = directRooms.get(callId); const p = r?.users.find(id => id !== socket.id); if (p) io.to(p).emit('friend-ice-candidate', { callId, candidate }); });
    socket.on('friend-call-end', ({ callId } = {}) => {
      const room = directRooms.get(callId);
      if (!room) return;
      room.users.forEach(uid => { callRoom.delete(uid); io.to(uid).emit('friend-call-ended', { callId }); });
      directRooms.delete(callId);
    });

    // Disconnect
    socket.on('disconnect', async (reason) => {
      removeFromQueues(socket.id);
      leaveRoom(socket, io);
      userGeo.delete(socket.id);
      const userId = socketUser.get(socket.id);
      if (userId) {
        socketUser.delete(socket.id);
        const set = userSockets.get(userId);
        if (set) { set.delete(socket.id); if (set.size === 0) userSockets.delete(userId); }
        if (!userSockets.has(userId)) {
          try {
            const friends = await db.all(
              'SELECT CASE WHEN user_id_1=? THEN user_id_2 ELSE user_id_1 END AS fid FROM friends WHERE user_id_1=? OR user_id_2=?',
              [userId, userId, userId]
            );
            friends.forEach(r => io.to(`user:${r.fid}`).emit('friend-offline', { userId }));
          } catch { /* ignore */ }
        }
      }
      const cid = callRoom.get(socket.id);
      if (cid) {
        const room = directRooms.get(cid);
        if (room) {
          room.users.filter(id => id !== socket.id).forEach(id => { callRoom.delete(id); io.to(id).emit('friend-call-ended', { callId: cid }); });
          directRooms.delete(cid);
        }
        callRoom.delete(socket.id);
      }
    });
  });

  // ── REST: Auth ─────────────────────────────────────────────────────────────
  // ── Google OAuth ─────────────────────────────────────────────────────────
  app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'No credential provided.' });
    if (!googleClient) return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
    try {
      const ticket  = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email) return res.status(401).json({ error: 'Invalid Google token.' });
      const { email, name, picture } = payload;
      const existing = await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
      if (existing) {
        if (existing.is_banned) return res.status(403).json({ error: 'This account has been banned.' });
        const token = uuidv4();
        await db.run('UPDATE users SET session_token=?, last_seen=? WHERE id=?', [token, Date.now(), existing.id]);
        return res.json({ type: 'login', user: { id: existing.id, name: existing.name, email: existing.email, dob: existing.dob, profilePhoto: existing.profile_photo, countryCode: existing.country_code, countryName: existing.country_name }, sessionToken: token });
      }
      // New user — need DOB before account creation
      const tempToken = uuidv4();
      googlePending.set(tempToken, { email: email.toLowerCase(), name: name || '', picture: picture || null, expiresAt: Date.now() + 600_000 });
      return res.json({ type: 'needs_dob', name, email, picture, tempToken });
    } catch (err) {
      console.error('[google-auth]', err);
      return res.status(401).json({ error: 'Google verification failed. Please try again.' });
    }
  });

  app.post('/api/auth/google/complete', async (req, res) => {
    const { tempToken, dob, displayName, countryCode, countryName } = req.body || {};
    if (!tempToken || !dob) return res.status(400).json({ error: 'Date of birth is required.' });
    const pending = googlePending.get(tempToken);
    if (!pending || pending.expiresAt < Date.now()) {
      googlePending.delete(tempToken);
      return res.status(401).json({ error: 'Session expired. Please sign in with Google again.' });
    }
    try {
      const existing = await db.get('SELECT id FROM users WHERE email=?', [pending.email]);
      if (existing) { googlePending.delete(tempToken); return res.status(409).json({ error: 'Account already exists. Please sign in.' }); }
      const id = uuidv4(), token = uuidv4(), now = Date.now();
      const name = (displayName?.trim()) || pending.name;
      await db.run(
        'INSERT INTO users (id,name,email,dob,profile_photo,session_token,country_code,country_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, name, pending.email, dob, pending.picture || null, token, countryCode || null, countryName || null, now]
      );
      googlePending.delete(tempToken);
      return res.json({ user: { id, name, email: pending.email, dob, profilePhoto: pending.picture || null, countryCode: countryCode || null, countryName: countryName || null }, sessionToken: token });
    } catch (err) {
      console.error('[google-complete]', err);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  });

  // ── Also block pairs from friend reports ─────────────────────────────────
  // (friend report endpoint calls apiFriendReport which already stores to DB;
  //  we also add to in-memory set so matching is blocked immediately)

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, dob, profilePhoto, password, countryCode, countryName } = req.body || {};
    if (!name || !email || !dob || !password) return res.status(400).json({ error: 'name, email, dob and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    try {
      const existing = await db.get('SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]);
      if (existing) return res.status(409).json({ error: 'Email already registered — please sign in.' });
      const id = uuidv4(), token = uuidv4(), now = Date.now();
      const passwordHash = await bcrypt.hash(password, 10);
      await db.run(
        'INSERT INTO users (id,name,email,dob,profile_photo,session_token,password_hash,country_code,country_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, name.trim(), email.toLowerCase().trim(), dob, profilePhoto || null, token, passwordHash, countryCode || null, countryName || null, now]
      );
      return res.json({ user: { id, name: name.trim(), email: email.toLowerCase().trim(), dob, profilePhoto: profilePhoto || null, countryCode: countryCode || null, countryName: countryName || null }, sessionToken: token });
    } catch (err) {
      console.error('[register]', err);
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    try {
      const user = await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase().trim()]);
      if (!user) return res.status(404).json({ error: 'No account found for this email — please sign up.' });
      if (user.is_banned) return res.status(403).json({ error: 'This account has been banned.' });
      if (!user.password_hash) return res.status(401).json({ error: 'Account has no password set — please sign up again.' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Incorrect password.' });
      const token = uuidv4();
      await db.run('UPDATE users SET session_token=?, last_seen=? WHERE id=?', [token, Date.now(), user.id]);
      return res.json({ user: { id: user.id, name: user.name, email: user.email, dob: user.dob, profilePhoto: user.profile_photo, countryCode: user.country_code, countryName: user.country_name }, sessionToken: token });
    } catch (err) { console.error('[login]', err); return res.status(500).json({ error: 'Login failed.' }); }
  });

  app.post('/api/auth/ping', async (req, res) => {
    const { userId, sessionToken } = req.body || {};
    if (!userId || !sessionToken) return res.status(400).json({ error: 'missing fields' });
    try {
      const user = await db.get('SELECT id, is_banned FROM users WHERE id=? AND session_token=?', [userId, sessionToken]);
      if (!user) return res.status(401).json({ error: 'Invalid session' });
      if (user.is_banned) return res.status(403).json({ error: 'Banned' });
      await db.run('UPDATE users SET last_seen=? WHERE id=?', [Date.now(), userId]);
      return res.json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Server error' }); }
  });

  // ── REST: Friends ──────────────────────────────────────────────────────────
  app.get('/api/friends', requireUser, async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT u.id, u.name, u.profile_photo, u.is_active, u.last_seen, u.country_code, u.country_name
        FROM friends f
        JOIN users u ON u.id = CASE WHEN f.user_id_1=? THEN f.user_id_2 ELSE f.user_id_1 END
        WHERE (f.user_id_1=? OR f.user_id_2=?) AND u.is_banned=0
        ORDER BY u.name
      `, [req.user.id, req.user.id, req.user.id]);
      const friends = rows.map(u => ({ ...u, profilePhoto: u.profile_photo, countryCode: u.country_code, countryName: u.country_name, isOnline: userSockets.has(u.id) }));
      res.json({ friends });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/friends/requests', requireUser, async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT fr.id, fr.from_id, fr.created_at, u.name, u.profile_photo
        FROM friend_requests fr JOIN users u ON u.id=fr.from_id
        WHERE fr.to_id=? AND fr.status='pending' ORDER BY fr.created_at DESC
      `, [req.user.id]);
      res.json({ requests: rows.map(r => ({ id: r.id, createdAt: r.created_at, from: { id: r.from_id, name: r.name, profilePhoto: r.profile_photo } })) });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });

  app.post('/api/friends/requests/:id/respond', requireUser, async (req, res) => {
    const { accept } = req.body || {};
    try {
      const request = await db.get("SELECT * FROM friend_requests WHERE id=? AND to_id=? AND status='pending'", [req.params.id, req.user.id]);
      if (!request) return res.status(404).json({ error: 'Request not found.' });
      if (accept) {
        await db.run("UPDATE friend_requests SET status='accepted' WHERE id=?", [req.params.id]);
        const [a, b] = [request.from_id, request.to_id].sort();
        try { await db.run('INSERT IGNORE INTO friends (id,user_id_1,user_id_2,created_at) VALUES (?,?,?,?)', [uuidv4(), a, b, Date.now()]); } catch { /* duplicate */ }
        io.to(`user:${request.from_id}`).emit('friend-request-accepted', { by: { id: req.user.id, name: req.user.name, profilePhoto: req.user.profile_photo } });
      } else {
        await db.run("UPDATE friend_requests SET status='declined' WHERE id=?", [req.params.id]);
      }
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/friends/check/:userId', requireUser, async (req, res) => {
    try {
      const row = await db.get('SELECT id FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)', [req.user.id, req.params.userId, req.params.userId, req.user.id]);
      res.json({ isFriend: !!row });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.delete('/api/friends/:friendId', requireUser, async (req, res) => {
    try {
      await db.run('DELETE FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)', [req.user.id, req.params.friendId, req.params.friendId, req.user.id]);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/friends/:friendId/messages', requireUser, async (req, res) => {
    const { friendId } = req.params;
    try {
      const areFriends = await db.get('SELECT id FROM friends WHERE (user_id_1=? AND user_id_2=?) OR (user_id_1=? AND user_id_2=?)', [req.user.id, friendId, friendId, req.user.id]);
      if (!areFriends) return res.status(403).json({ error: 'Not friends.' });
      const messages = await db.all(
        'SELECT id, from_id, to_id, content, created_at FROM direct_messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY created_at ASC LIMIT 100',
        [req.user.id, friendId, friendId, req.user.id]
      );
      res.json({ messages });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  // Report a friend
  app.post('/api/friends/:friendId/report', requireUser, async (req, res) => {
    const { friendId } = req.params;
    const { category = 'other', description, screenshot, chatLog } = req.body || {};
    const safeCategory = ['nudity','harassment','spam','underage','violence','other'].includes(category) ? category : 'other';
    try {
      await db.run(
        `INSERT INTO reports (id, reporter_user_id, reported_user_id, category, description, screenshot, chat_log, reason, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          uuidv4(), req.user.id, friendId, safeCategory,
          description?.slice(0, 1000) || null,
          typeof screenshot === 'string' && screenshot.startsWith('data:image/') ? screenshot : null,
          Array.isArray(chatLog) ? JSON.stringify(chatLog.slice(-30)) : null,
          safeCategory, 'pending', Date.now(),
        ]
      );
      res.json({ ok: true });
    } catch (err) { console.error('[friend-report]', err); res.status(500).json({ error: 'Server error' }); }
  });

  app.patch('/api/users/me/active-status', requireUser, async (req, res) => {
    const { isActive } = req.body || {};
    try {
      await db.run('UPDATE users SET is_active=? WHERE id=?', [isActive ? 1 : 0, req.user.id]);
      res.json({ ok: true, isActive: Boolean(isActive) });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  // ── REST: Contact ──────────────────────────────────────────────────────────
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (message.trim().length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters.' });
    try {
      await db.run('INSERT INTO contact_submissions (id,name,email,subject,message,status,created_at) VALUES (?,?,?,?,?,?,?)', [uuidv4(), name.trim(), email.toLowerCase().trim(), subject.trim(), message.trim(), 'new', Date.now()]);
      return res.json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Failed to submit. Please try again.' }); }
  });

  // ── REST: Admin ────────────────────────────────────────────────────────────
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === ADMIN_USER && password === ADMIN_PASS) return res.json({ token: ADMIN_TOKEN });
    return res.status(401).json({ error: 'Invalid credentials' });
  });

  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      const [tu, tr, bu] = await Promise.all([
        db.get('SELECT COUNT(*) AS n FROM users'),
        db.get('SELECT COUNT(*) AS n FROM reports'),
        db.get('SELECT COUNT(*) AS n FROM users WHERE is_banned=1'),
      ]);
      res.json({
        totalUsers: Number(tu.n), totalReports: Number(tr.n), bannedUsers: Number(bu.n),
        activeConnections: io.sockets.sockets.size, activeRooms: rooms.size,
        textQueue: textQueue.length, videoQueue: videoQueue.length,
        uptime: Math.floor(process.uptime()),
      });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const offset = (page - 1) * limit;
    try {
      const [users, total] = await Promise.all([
        db.all('SELECT id, name, email, dob, created_at, last_seen, is_banned FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]),
        db.get('SELECT COUNT(*) AS n FROM users'),
      ]);
      res.json({ users, total: Number(total.n), page, limit });
    } catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    const status = req.query.status || 'all';
    const limit  = Math.min(200, parseInt(req.query.limit || '100', 10));
    const offset = parseInt(req.query.offset || '0', 10);
    try {
      const VALID_STATUSES = ['pending', 'actioned', 'dismissed'];
      const filterByStatus = VALID_STATUSES.includes(status);
      const reports = await db.all(
        `SELECT r.*,
           ur.name AS reported_name, ur.email AS reported_email, ur.is_banned AS reported_is_banned, ur.risk_score,
           rep.name AS reporter_name
         FROM reports r
         LEFT JOIN users ur  ON ur.id  = r.reported_user_id
         LEFT JOIN users rep ON rep.id = r.reporter_user_id
         ${filterByStatus ? 'WHERE r.status = ?' : ''}
         ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        filterByStatus ? [status, limit, offset] : [limit, offset]
      );
      const total = await db.get(
        `SELECT COUNT(*) AS n FROM reports ${filterByStatus ? 'WHERE status = ?' : ''}`,
        filterByStatus ? [status] : []
      );
      res.json({ reports, total: Number(total?.n ?? 0) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  });

  // Admin: action on a report
  app.post('/api/admin/reports/:id/action', requireAdmin, async (req, res) => {
    const { action, note } = req.body || {};
    const report = await db.get('SELECT * FROM reports WHERE id=?', [req.params.id]).catch(() => null);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    try {
      const now = Date.now();
      if (action === 'ban' && report.reported_user_id) {
        await db.run('UPDATE users SET is_banned=1 WHERE id=?', [report.reported_user_id]);
      } else if (action === 'unban' && report.reported_user_id) {
        await db.run('UPDATE users SET is_banned=0, temp_banned_until=NULL, risk_score=0 WHERE id=?', [report.reported_user_id]);
      } else if (action === 'temp_ban_24h' && report.reported_user_id) {
        await db.run('UPDATE users SET temp_banned_until=? WHERE id=?', [now + 86_400_000, report.reported_user_id]);
      } else if (action === 'false_report' && report.reporter_user_id) {
        // Penalise the reporter slightly
        await db.run('UPDATE users SET risk_score=GREATEST(0, risk_score-5) WHERE id=?', [report.reporter_user_id]);
      }
      await db.run(
        'UPDATE reports SET status=?, reviewer_note=?, reviewed_at=? WHERE id=?',
        [action === 'ignore' || action === 'false_report' ? 'dismissed' : 'actioned', note || null, now, req.params.id]
      );
      res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/admin/enquiries', requireAdmin, async (_req, res) => {
    try { res.json({ enquiries: await db.all('SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 500') }); }
    catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.patch('/api/admin/enquiries/:id/status', requireAdmin, async (req, res) => {
    try { await db.run('UPDATE contact_submissions SET status=? WHERE id=?', [req.body?.status, req.params.id]); res.json({ ok: true }); }
    catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.patch('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
    try { await db.run('UPDATE users SET is_banned=? WHERE id=?', [req.body?.banned ? 1 : 0, req.params.id]); res.json({ ok: true }); }
    catch { res.status(500).json({ error: 'Server error' }); }
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try { await db.run('DELETE FROM users WHERE id=?', [req.params.id]); res.json({ ok: true }); }
    catch { res.status(500).json({ error: 'Server error' }); }
  });

  // ── ICE servers — generates Metered TURN credentials via HMAC (RFC 5766) ──
  app.get('/api/ice-servers', (_req, res) => {
    const domain = process.env.METERED_DOMAIN;
    const secret = process.env.METERED_API_KEY;

    if (!domain || !secret) {
      return res.json([
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]);
    }

    // Credentials expire in 24 hours
    const expiry   = Math.floor(Date.now() / 1000) + 86400;
    const username = String(expiry);
    const credential = require('crypto')
      .createHmac('sha1', secret)
      .update(username)
      .digest('base64');

    res.json([
      { urls: `stun:${domain}:80` },
      { urls: `stun:${domain}:443` },
      { urls: `turn:${domain}:80`,                  username, credential },
      { urls: `turn:${domain}:80?transport=tcp`,    username, credential },
      { urls: `turn:${domain}:443?transport=tcp`,   username, credential },
      { urls: `turns:${domain}:443?transport=tcp`,  username, credential },
    ]);
  });

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', textQueue: textQueue.length, videoQueue: videoQueue.length, activeRooms: rooms.size, uptime: process.uptime() });
  });
}

module.exports = { attachSocketAndApi };
