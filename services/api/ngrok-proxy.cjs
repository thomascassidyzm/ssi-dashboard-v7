#!/usr/bin/env node

/**
 * ngrok Reverse Proxy
 *
 * Single ngrok tunnel that routes to multiple phase servers:
 * - /phase1/* → localhost:3457 (Phase 1: Translation)
 * - /phase3/* → localhost:3458 (Phase 3: LEGO Extraction)
 * - /phase5/* → localhost:3459 (Phase 5: Basket Generation)
 *
 * This allows agents to use one ngrok URL with different paths.
 *
 * Port: 3463 (ngrok tunnels to this port)
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3463;

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
    timestamp: new Date().toISOString(),
    routes: {
      '/api/*': 'http://localhost:3456',
      '/phase1/*': 'http://localhost:3457',
      '/phase3/*': 'http://localhost:3458',
      '/phase5/*': 'http://localhost:3459',
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

// API proxy (Dashboard API - languages, courses, etc.) - AFTER phase proxies
// Use a filter function to match /api/* without stripping the prefix
app.use(createProxyMiddleware({
  target: 'http://localhost:3456',
  changeOrigin: true,
  // Only proxy requests starting with /api/
  filter: (pathname, req) => pathname.startsWith('/api/'),
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
    availableRoutes: ['/api/*', '/phase1/*', '/phase3/*', '/phase5/*', '/health']
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log(`✅ ngrok Reverse Proxy listening on port ${PORT}`);
  console.log('');
  console.log(`📡 Routes:`);
  console.log(`   /api/*    → http://localhost:3456 (Dashboard API)`);
  console.log(`   /phase1/* → http://localhost:3457 (Phase 1: Translation)`);
  console.log(`   /phase3/* → http://localhost:3458 (Phase 3: LEGO Extraction)`);
  console.log(`   /phase5/* → http://localhost:3459 (Phase 5: Basket Generation)`);
  console.log('');
  console.log(`🌐 Usage:`);
  console.log(`   Dashboard: GET https://your-ngrok-url/api/languages`);
  console.log(`   Phase 1: POST https://your-ngrok-url/phase1/upload-translations`);
  console.log(`   Phase 3: POST https://your-ngrok-url/phase3/upload-legos`);
  console.log(`   Phase 5: POST https://your-ngrok-url/phase5/upload-basket`);
  console.log('');
  console.log(`💡 Configure ngrok to tunnel to this port:`);
  console.log(`   ngrok http ${PORT} --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`);
  console.log('');
});

module.exports = app;
