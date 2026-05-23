'use strict';
// Local development: stand-alone Socket.IO + API server on port 3001
// Next.js runs separately on port 3000 via `next dev`

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const http    = require('http');
const express = require('express');
const { attachSocketAndApi } = require('./index');

const app    = express();
const server = http.createServer(app);

attachSocketAndApi(app, server);

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  VibeLink signaling server  →  http://localhost:${PORT}\n`);
});
