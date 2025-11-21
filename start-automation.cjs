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
const SERVICES = {
  orchestrator: {
    script: 'services/orchestration/orchestrator.cjs',
    port: BASE_PORT,      // 3456
    name: 'Orchestrator',
    color: '\x1b[36m'    // Cyan
  },
  phase1: {
    script: 'services/phases/phase1-translation/server.cjs',
    port: BASE_PORT + 1,  // 3457
    name: 'Phase 1 (Translation)',
    color: '\x1b[32m'    // Green
  },
  phase3: {
    script: 'services/phases/phase3-lego-extraction/server.cjs',
    port: BASE_PORT + 2,  // 3458
    name: 'Phase 3 (LEGO Extraction)',
    color: '\x1b[33m'    // Yellow
  },
  phase5: {
    script: 'services/phases/phase5-basket-generation/server.cjs',
    port: BASE_PORT + 3,  // 3459
    name: 'Phase 5 (Baskets)',
    color: '\x1b[35m'    // Magenta
  },
  // Phase 5.5 (Grammar Validation) - DISABLED
  // Using human semi-manual review for first 100 seeds instead
  // Quality gates can be added incrementally later
  // phase5_5: {
  //   script: 'services/phases/phase5.5-grammar-validation-server.cjs',
  //   port: BASE_PORT + 4,  // 3460
  //   name: 'Phase 5.5 (Grammar)',
  //   color: '\x1b[95m'    // Bright Magenta
  // },
  // phase7: {
  //   script: 'services/phases/phase7-manifest-server.cjs',  // DEPRECATED - use scripts/phase7-compile-manifest-v2.cjs
  //   port: BASE_PORT + 8,  // 3464
  //   name: 'Phase 7 (Manifest)',
  //   color: '\x1b[34m'    // Blue
  // },
  phase8: {
    script: 'services/phases/phase8-audio-server.cjs',
    port: BASE_PORT + 9,  // 3465
    name: 'Phase 8 (Audio)',
    color: '\x1b[36m'    // Cyan
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
      // Phase servers need to know each other (for service mesh)
      PHASE1_URL: `http://localhost:${BASE_PORT + 1}`,    // 3457 - Translation (includes Phase 2 LUT)
      PHASE3_URL: `http://localhost:${BASE_PORT + 2}`,    // 3458 - LEGO Extraction (includes Phase 6 introductions)
      PHASE5_URL: `http://localhost:${BASE_PORT + 3}`,    // 3459 - Practice Baskets
      // PHASE5_5_URL: `http://localhost:${BASE_PORT + 4}`,  // 3460 - Grammar Validation (DISABLED)
      PHASE7_URL: `http://localhost:${BASE_PORT + 8}`,    // 3464 - Manifest Compilation
      PHASE8_URL: `http://localhost:${BASE_PORT + 9}`,    // 3465 - Audio/TTS
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
