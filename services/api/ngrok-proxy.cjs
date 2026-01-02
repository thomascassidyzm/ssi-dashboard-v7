#!/usr/bin/env node

/**
 * ngrok Reverse Proxy - CRITICAL PRODUCTION SERVICE
 *
 * Single ngrok tunnel that routes to multiple backend services.
 * This is THE entry point for external agents working via Claude Projects.
 *
 * Routes:
 * - /api/production/* → localhost:3470 (Production API + WebSocket)
 * - /api/* → localhost:3456 (Dashboard API / Orchestrator)
 * - /phase1/* → localhost:3457 (Phase 1: Translation)
 * - /phase3/* → localhost:3458 (Phase 3: LEGO Extraction)
 * - /phase5/* → localhost:3459 (Phase 5: Basket Generation)
 * - /phase8/* → localhost:3465 (Phase 8: Audio/TTS)
 *
 * Port: 3463 (ngrok tunnels to this port)
 * Ngrok Domain: mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
 *
 * STATUS: ✅ ACTIVE - Used by dashboard EnvironmentSwitcher.vue and external agents
 * STARTED BY: PM2 (ecosystem.config.cjs), NOT in start-automation.cjs
 *
 * Why not in start-automation.cjs:
 * - Requires ngrok tunnel setup (separate process in PM2)
 * - Only needed for external agent access
 * - Local development typically uses direct localhost connections
 *
 * To start manually:
 *   PORT=3463 node services/api/ngrok-proxy.cjs
 *   ngrok http 3463 --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
 *
 * To start with PM2:
 *   pm2 start ecosystem.config.cjs --only ngrok-proxy,ngrok-tunnel
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3463;
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';

// Enable CORS for all routes
app.use(cors());

// Phase 1 proxy (Translation)
app.use('/phase1', createProxyMiddleware({
  target: 'http://localhost:3457',
  changeOrigin: true,
  pathRewrite: {
    '^/phase1': '' // Remove /phase1 prefix before forwarding
  },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Phase 1 Proxy] ${req.method} ${req.path} → http://localhost:3457${req.path.replace('/phase1', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[Phase 1 Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Phase 1 server unavailable',
      details: err.message
    });
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ngrok Reverse Proxy',
    port: PORT,
    timestamp: new Date().toISOString(),
    routes: {
      '/api/production/*': 'http://localhost:3470',
      '/api/*': 'http://localhost:3456',
      '/phase1/*': 'http://localhost:3457',
      '/phase3/*': 'http://localhost:3458',
      '/phase5/*': 'http://localhost:3459',
      '/phase8/*': 'http://localhost:3465',
      backward_compat: {
        '/upload-translations': 'http://localhost:3457',
        '/upload-legos': 'http://localhost:3458',
        '/upload-basket': 'http://localhost:3459'
      }
    }
  });
});

// ===== BACKWARD COMPATIBILITY ROUTES =====
// Legacy agents POST to unprefixed paths - proxy them to phase servers
// These MUST come before /phase* routes to match first

app.post('/upload-translations', createProxyMiddleware({
  target: 'http://localhost:3457',
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Legacy Phase 1] ${req.method} /upload-translations → http://localhost:3457/upload-translations`);
  }
}));

app.post('/upload-legos', createProxyMiddleware({
  target: 'http://localhost:3458',
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Legacy Phase 3] ${req.method} /upload-legos → http://localhost:3458/upload-legos`);
  }
}));

app.post('/upload-basket', createProxyMiddleware({
  target: 'http://localhost:3459',
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Legacy Phase 5] ${req.method} /upload-basket → http://localhost:3459/upload-basket`);
  }
}));

// Phase 3 proxy (LEGO Extraction) - BEFORE API proxy to avoid conflicts
app.use('/phase3', createProxyMiddleware({
  target: 'http://localhost:3458',
  changeOrigin: true,
  pathRewrite: {
    '^/phase3': '' // Remove /phase3 prefix before forwarding
  },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Phase 3 Proxy] ${req.method} ${req.path} → http://localhost:3458${req.path.replace('/phase3', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[Phase 3 Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Phase 3 server unavailable',
      details: err.message
    });
  }
}));

// Phase 5 proxy (Basket Generation) - BEFORE API proxy to avoid conflicts
app.use('/phase5', createProxyMiddleware({
  target: 'http://localhost:3459',
  changeOrigin: true,
  pathRewrite: {
    '^/phase5': '' // Remove /phase5 prefix before forwarding
  },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Phase 5 Proxy] ${req.method} ${req.path} → http://localhost:3459${req.path.replace('/phase5', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[Phase 5 Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Phase 5 server unavailable',
      details: err.message
    });
  }
}));

// Phase 8 proxy (Audio/TTS Generation) - BEFORE API proxy to avoid conflicts
app.use('/phase8', createProxyMiddleware({
  target: 'http://localhost:3465',
  changeOrigin: true,
  pathRewrite: {
    '^/phase8': '' // Remove /phase8 prefix before forwarding
  },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Phase 8 Proxy] ${req.method} ${req.path} → http://localhost:3465${req.path.replace('/phase8', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[Phase 8 Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Phase 8 Audio server unavailable',
      details: err.message
    });
  }
}));

// Production API proxy (QA workflow, flags, WebSocket) - BEFORE general API proxy
// Use filter function to preserve full path (don't strip /api/production)
app.use(createProxyMiddleware({
  target: 'http://localhost:3470',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  filter: (pathname) => pathname.startsWith('/api/production'),
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Production API Proxy] ${req.method} ${req.originalUrl} → http://localhost:3470${req.originalUrl}`);
  },
  onError: (err, req, res) => {
    console.error(`[Production API Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Production API server unavailable',
      details: err.message
    });
  }
}));

// API proxy (Dashboard API - languages, courses, etc.) - AFTER phase proxies
// Use a filter function to match /api/* but EXCLUDE /api/production/* (handled above)
app.use(createProxyMiddleware({
  target: 'http://localhost:3456',
  changeOrigin: true,
  // Only proxy /api/* requests that are NOT /api/production/*
  filter: (pathname, req) => pathname.startsWith('/api/') && !pathname.startsWith('/api/production'),
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Proxy] ${req.method} ${req.originalUrl} → http://localhost:3456${req.originalUrl}`);
  },
  onError: (err, req, res) => {
    console.error(`[API Proxy Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'API server unavailable',
      details: err.message
    });
  }
}));

// Root route - show available endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'SSI Dashboard ngrok Proxy',
    version: '1.0.0',
    routes: {
      phase1: {
        uploadTranslations: 'POST /phase1/upload-translations',
        status: 'GET /phase1/status/:courseCode'
      },
      phase3: {
        uploadLegos: 'POST /phase3/upload-legos',
        progress: 'GET /phase3/progress/:course',
        status: 'GET /phase3/status/:courseCode'
      },
      phase5: {
        uploadBaskets: 'POST /phase5/upload-basket',
        basketStatus: 'GET /phase5/basket-status/:course'
      }
    },
    example: {
      phase1: 'curl -X POST https://your-ngrok-url.dev/phase1/upload-translations -H "Content-Type: application/json" -d \'{"course": "spa_for_eng", "seedId": "S0001", "translation": ["known", "target"]}\'',
      phase3: 'curl -X POST https://your-ngrok-url.dev/phase3/upload-legos -H "Content-Type: application/json" -d \'{"course": "cmn_for_eng", ...}\'',
      phase5: 'curl -X POST https://your-ngrok-url.dev/phase5/upload-basket -H "Content-Type: application/json" -d \'{"course": "cmn_for_eng", ...}\''
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    availableRoutes: ['/api/production/*', '/api/*', '/phase1/*', '/phase3/*', '/phase5/*', '/phase8/*', '/health']
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ngrok Reverse Proxy listening on port ${PORT}`);
  console.log(`   🌐 Public URL: https://${NGROK_DOMAIN}`);
  console.log('');
  console.log(`📡 Routes:`);
  console.log(`   /api/production/* → http://localhost:3470 (Production API + WebSocket)`);
  console.log(`   /api/*            → http://localhost:3456 (Dashboard API)`);
  console.log(`   /phase1/*         → http://localhost:3457 (Phase 1: Translation)`);
  console.log(`   /phase3/*         → http://localhost:3458 (Phase 3: LEGO Extraction)`);
  console.log(`   /phase5/*         → http://localhost:3459 (Phase 5: Basket Generation)`);
  console.log(`   /phase8/*         → http://localhost:3465 (Phase 8: Audio/TTS)`);
  console.log('');
  console.log(`🌐 Usage:`);
  console.log(`   Dashboard: GET https://${NGROK_DOMAIN}/api/languages`);
  console.log(`   Production: GET https://${NGROK_DOMAIN}/api/production/spa_for_eng/manifest`);
  console.log(`   Phase 1: POST https://${NGROK_DOMAIN}/phase1/upload-translations`);
  console.log(`   Phase 3: POST https://${NGROK_DOMAIN}/phase3/upload-legos`);
  console.log(`   Phase 5: POST https://${NGROK_DOMAIN}/phase5/upload-basket`);
  console.log(`   Phase 8: POST https://${NGROK_DOMAIN}/phase8/plan`);
  console.log('');
  console.log(`💡 Start ngrok tunnel (if not already running):`);
  console.log(`   ngrok http ${PORT} --domain=${NGROK_DOMAIN}`);
  console.log('');
  console.log(`ℹ️  This proxy is ACTIVE in production. Used by:`);
  console.log(`   - Dashboard EnvironmentSwitcher (Tom's Machine option)`);
  console.log(`   - External agents working via Claude Projects`);
  console.log(`   - PM2 automation (ecosystem.config.cjs)`);
  console.log('');
});

module.exports = app;
