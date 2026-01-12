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
// Mount at /api/production and let proxy forward the full path
app.use('/api/production', createProxyMiddleware({
  target: 'http://localhost:3470',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  // Don't rewrite path - keep /api/production prefix
  pathRewrite: (path) => `/api/production${path}`,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Production API Proxy] ${req.method} /api/production${req.path} → http://localhost:3470/api/production${req.path}`);
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
// Mount at /api and rewrite path to include /api prefix
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3456',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying for /api/orchestrator/websocket
  // Rewrite path to include /api prefix (which Express strips on mount)
  pathRewrite: (path) => `/api${path}`,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Proxy] ${req.method} /api${req.path} → http://localhost:3456/api${req.path}`);
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

// ===== FRONTEND PROXY =====
// All other routes (non-API) proxy to Vite dev server for the dashboard UI
// This allows accessing the full dashboard via ngrok including:
// - Production Suite (/production/*)
// - Recording Optimizer (/production/:courseCode/recording-optimizer)
// - All other frontend routes

app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying for Vite HMR
  logLevel: 'warn', // Less verbose for frontend
  onProxyReq: (proxyReq, req, res) => {
    // Only log non-asset requests
    if (!req.path.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)$/)) {
      console.log(`[Frontend Proxy] ${req.method} ${req.path} → http://localhost:5173${req.path}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`[Frontend Proxy Error] ${err.message}`);
    res.status(502).send(`
      <html>
        <head><title>Dashboard Unavailable</title></head>
        <body style="font-family: system-ui; background: #1e293b; color: #e2e8f0; padding: 2rem;">
          <h1 style="color: #f87171;">Dashboard UI Not Available</h1>
          <p>The Vite dev server is not running on port 5173.</p>
          <p>Start it with: <code style="background: #334155; padding: 0.25rem 0.5rem; border-radius: 4px;">npm run dev</code></p>
          <p style="margin-top: 2rem; color: #94a3b8;">API routes are still available at /api/* and /phase*/*</p>
        </body>
      </html>
    `);
  }
}));

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
  console.log(`   /*                → http://localhost:5173 (Dashboard UI / Vite)`);
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
