'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Production entry point for Namecheap cPanel
//  Runs Next.js build + Socket.IO + REST API in a single Node.js process
//  Set this file as the "Application startup file" in cPanel Node.js Manager
// ─────────────────────────────────────────────────────────────────────────────

const path    = require('path');
const http    = require('http');
const express = require('express');
const next    = require('next');
const { attachSocketAndApi } = require('./server/index');

const PORT     = parseInt(process.env.PORT || '3000', 10);
const dev      = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';

const nextApp = next({ dev, hostname, port: PORT, dir: __dirname });
const handle  = nextApp.getRequestHandler();

nextApp.prepare()
  .then(() => {
    const expressApp = express();
    const httpServer = http.createServer(expressApp);

    // Wire Socket.IO + all /api/* routes
    attachSocketAndApi(expressApp, httpServer);

    // Next.js handles all remaining routes (pages, assets, _next/*)
    expressApp.all('*', (req, res) => handle(req, res));

    httpServer.listen(PORT, hostname, () => {
      console.log(`\n  ✓ VibeLink ready → http://${hostname}:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
