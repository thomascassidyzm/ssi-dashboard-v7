#!/usr/bin/env node

/**
 * Zero-Config Automation Starter
 *
 * Reads .env.automation once, then starts all automation services with auto-configured ports.
 *
 * Usage:
 *   npm run automation
 *   or
 *   node start-automation.js
 *
 * Configuration:
 *   Create .env.automation with:
 *     VFS_ROOT=/path/to/your/SSi_Course_Production
 */

require('dotenv').config({ path: '.env.automation' });
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Validate VFS_ROOT is set
const VFS_ROOT = process.env.VFS_ROOT;
if (!VFS_ROOT) {
  console.error('');
  console.error('❌ Error: VFS_ROOT not set in .env.automation');
  console.error('');
  console.error('📝 Setup instructions:');
  console.error('   1. Copy the example config:');
  console.error('      cp .env.example .env.automation');
  console.error('');
  console.error('   2. Edit .env.automation and set your path:');
  console.error('      VFS_ROOT=/Users/yourname/path/to/SSi_Course_Production');
  console.error('');
  console.error('   3. Run again:');
  console.error('      npm run automation');
  console.error('');
  process.exit(1);
}

// Validate VFS_ROOT exists
if (!fs.existsSync(VFS_ROOT)) {
  console.error('');
  console.error(`❌ Error: VFS_ROOT path does not exist: ${VFS_ROOT}`);
  console.error('');
  console.error('Please set VFS_ROOT to your actual SSi_Course_Production path in .env.automation');
  console.error('');
  process.exit(1);
}

// Smart defaults - everything derives from BASE_PORT
const BASE_PORT = parseInt(process.env.BASE_PORT || '3456');
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';
const NGROK_URL = process.env.NGROK_URL || `http://localhost:${BASE_PORT}`;

// Start layered services (microservices architecture)
startLayeredServices();

function startLayeredServices() {
// APML v9.0 Service Configuration
// Phase 1 = Translation + LEGO Extraction (two services, one phase)
// Phase 2 = Conflict Resolution (handled in Phase 1 LEGO service)
// Phase 3 = Basket Generation
// Manifest = Course Compilation (no phase number)
// Audio = TTS Generation (no phase number)
const SERVICES = {
  orchestrator: {
    script: 'services/orchestration/orchestrator.cjs',
    port: BASE_PORT,      // 3456
    name: 'Orchestrator',
    color: '\x1b[36m'    // Cyan
  },
  phase1_translation: {
    script: 'services/phases/phase1-translation/server.cjs',
    port: BASE_PORT + 1,  // 3457
    name: 'Phase 1 (Translation)',
    color: '\x1b[32m'    // Green
  },
  phase2: {
    script: 'services/phases/phase2-conflict-resolution/server.cjs',
    port: BASE_PORT + 2,  // 3458
    name: 'Phase 2 (Conflict Resolution)',
    color: '\x1b[33m'    // Yellow
  },
  phase3: {
    script: 'services/phases/phase3-basket-generation/server.cjs',
    port: BASE_PORT + 3,  // 3459
    name: 'Phase 3 (Baskets)',
    color: '\x1b[35m'    // Magenta
  },
  manifest: {
    script: 'services/phases/manifest-compilation/server.cjs',
    port: BASE_PORT + 8,  // 3464
    name: 'Manifest Compilation',
    color: '\x1b[34m'    // Blue
  },
  phase8_audio: {
    script: 'services/phases/phase8-audio-generator.cjs',
    port: BASE_PORT + 9,  // 3465
    name: 'Phase 8 (Audio Generator)',
    color: '\x1b[96m'    // Bright Cyan
  },
  phase9_manifest: {
    script: 'services/phases/phase9-manifest-compiler.cjs',
    port: BASE_PORT + 10, // 3466
    name: 'Phase 9 (Manifest Compiler)',
    color: '\x1b[92m'    // Bright Green
  },
  production_api: {
    script: 'services/production-api.cjs',
    port: BASE_PORT + 14, // 3470
    name: 'Production API',
    color: '\x1b[95m'    // Bright Magenta
  }
};

console.log('');
console.log('🚀 Starting SSi Automation Services (Layered Architecture)');
console.log('');
console.log(`📁 VFS Root: ${VFS_ROOT}`);
console.log(`🎛️  Checkpoint Mode: ${CHECKPOINT_MODE}`);
console.log(`🔌 Base Port: ${BASE_PORT}`);
console.log('');
console.log('Services:');

const processes = [];

// Start each service with shared config
for (const [key, config] of Object.entries(SERVICES)) {
  console.log(`  ${config.color}●\x1b[0m ${config.name.padEnd(30)} → http://localhost:${config.port}`);

  const proc = spawn('node', [config.script], {
    env: {
      ...process.env,
      PORT: config.port,
      VFS_ROOT: VFS_ROOT,
      CHECKPOINT_MODE: CHECKPOINT_MODE,
      SERVICE_NAME: config.name,
      // Phase servers need to know orchestrator (use ngrok URL for external agents)
      ORCHESTRATOR_URL: NGROK_URL,
      // APML v9.0 Service Mesh URLs
      PHASE1_TRANSLATION_URL: `http://localhost:${BASE_PORT + 1}`,  // 3457 - Translation
      PHASE1_LEGO_URL: `http://localhost:${BASE_PORT + 2}`,         // 3458 - LEGO Extraction (+ conflict resolution)
      PHASE3_URL: `http://localhost:${BASE_PORT + 3}`,              // 3459 - Basket Generation
      MANIFEST_URL: `http://localhost:${BASE_PORT + 8}`,            // 3464 - Course Manifest Compilation (legacy)
      PHASE8_URL: `http://localhost:${BASE_PORT + 9}`,              // 3465 - Phase 8 Audio Generator (Supabase)
      PHASE9_URL: `http://localhost:${BASE_PORT + 10}`,             // 3466 - Phase 9 Manifest Compiler (Supabase)
      AUDIO_URL: `http://localhost:${BASE_PORT + 9}`,               // 3465 - TTS Audio Generation (alias)
      PRODUCTION_API_URL: `http://localhost:${BASE_PORT + 14}`,     // 3470 - Production API (QA workflow + WebSocket)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Color-coded logging
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      console.log(`${config.color}[${config.name}]\x1b[0m ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      console.error(`${config.color}[${config.name}]\x1b[0m \x1b[31m${line}\x1b[0m`);
    });
  });

  proc.on('error', (err) => {
    console.error(`\n❌ ${config.name} failed to start:`, err);
  });

  proc.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ ${config.name} exited with code ${code}`);
    }
  });

  processes.push({ name: config.name, proc, color: config.color });
}

console.log('');
console.log('✅ All services started!');
console.log('');
console.log('📊 Dashboard:        https://ssi-dashboard-v7.vercel.app');
console.log(`🔧 Orchestrator API: http://localhost:${BASE_PORT}`);
console.log('');
console.log('Press Ctrl+C to stop all services');
console.log('');

// Graceful shutdown
let shuttingDown = false;
process.on('SIGINT', () => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('');
  console.log('🛑 Shutting down all services...');
  console.log('');

  processes.forEach(({ name, proc, color }) => {
    console.log(`  ${color}●\x1b[0m Stopping ${name}...`);
    proc.kill('SIGTERM');
  });

  // Force kill after 5 seconds
  setTimeout(() => {
    processes.forEach(({ proc }) => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    });
    console.log('');
    console.log('✅ All services stopped');
    console.log('');
    process.exit(0);
  }, 5000);
});

// Also handle SIGTERM (for PM2, Docker, etc)
process.on('SIGTERM', () => {
  process.emit('SIGINT');
});
}
