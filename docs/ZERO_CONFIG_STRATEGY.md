# Zero-Configuration Strategy for Layered Automation

## Problem

Layered architecture (6 services) means 6x the configuration headaches:
- 6 port numbers to remember
- 6 VFS_ROOT paths to set
- 6 .env files to maintain
- Breaking changes when Kai/Tom have different paths

## Solution: Single Entry Point + Auto-Discovery

### Developer Experience (What We Want)

```bash
# Clone repo
git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
cd ssi-dashboard-v7-clean

# One-time setup (just set YOUR course production path)
cp .env.example .env.automation
nano .env.automation
  # VFS_ROOT=/Users/tomcassidy/SSi/SSi_Course_Production  (Tom's path)
  # or
  # VFS_ROOT=/Users/kai/Projects/SSi_Course_Production    (Kai's path)

# Start everything
npm run automation

# That's it! No other config needed.
```

### How It Works

#### 1. Single Config File (`.env.automation`)

```bash
# .env.automation (gitignored, per-developer)

# The ONLY thing you configure - your local course production folder
VFS_ROOT=/Users/tomcassidy/SSi/SSi_Course_Production

# Everything else has smart defaults
# (Optional overrides if you want to customize)
# CHECKPOINT_MODE=gated
# BASE_PORT=3456
```

#### 2. Auto-Start Script (`start-automation.js`)

```javascript
#!/usr/bin/env node

/**
 * Zero-Config Automation Starter
 *
 * Reads .env.automation once, then starts all services with auto-configured ports
 */

require('dotenv').config({ path: '.env.automation' });
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Validate VFS_ROOT is set
const VFS_ROOT = process.env.VFS_ROOT;
if (!VFS_ROOT) {
  console.error('❌ Error: VFS_ROOT not set in .env.automation');
  console.error('');
  console.error('Create .env.automation with:');
  console.error('  VFS_ROOT=/path/to/your/SSi_Course_Production');
  console.error('');
  process.exit(1);
}

// Validate VFS_ROOT exists
if (!fs.existsSync(VFS_ROOT)) {
  console.error(`❌ Error: VFS_ROOT path does not exist: ${VFS_ROOT}`);
  console.error('');
  console.error('Please set VFS_ROOT to your actual SSi_Course_Production path in .env.automation');
  console.error('');
  process.exit(1);
}

// Smart defaults - everything derives from BASE_PORT
const BASE_PORT = parseInt(process.env.BASE_PORT || '3456');
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';

// Auto-configured service ports
const SERVICES = {
  orchestrator: {
    script: 'services/orchestration/orchestrator.cjs',
    port: BASE_PORT,      // 3456
    name: 'Orchestrator'
  },
  phase1: {
    script: 'services/phases/phase1-translation-server.cjs',
    port: BASE_PORT + 1,  // 3457
    name: 'Phase 1 (Translation)'
  },
  phase3: {
    script: 'services/phases/phase3-lego-extraction-server.cjs',
    port: BASE_PORT + 2,  // 3458
    name: 'Phase 3 (LEGO Extraction)'
  },
  phase5: {
    script: 'services/phases/phase5-basket-server.cjs',
    port: BASE_PORT + 3,  // 3459
    name: 'Phase 5 (Baskets)'
  },
  phase6: {
    script: 'services/phases/phase6-introduction-server.cjs',
    port: BASE_PORT + 4,  // 3460
    name: 'Phase 6 (Introductions)'
  },
  phase8: {
    script: 'services/phases/phase8-audio-server.cjs',
    port: BASE_PORT + 5,  // 3461
    name: 'Phase 8 (Audio)'
  }
};

console.log('🚀 Starting SSi Automation Services...\n');
console.log(`📁 VFS Root: ${VFS_ROOT}`);
console.log(`🎛️  Checkpoint Mode: ${CHECKPOINT_MODE}`);
console.log(`🔌 Base Port: ${BASE_PORT}\n`);

const processes = [];

// Start each service with shared config
for (const [key, config] of Object.entries(SERVICES)) {
  console.log(`Starting ${config.name} on port ${config.port}...`);

  const proc = spawn('node', [config.script], {
    env: {
      ...process.env,
      PORT: config.port,
      VFS_ROOT: VFS_ROOT,
      CHECKPOINT_MODE: CHECKPOINT_MODE,
      // Phase servers need to know orchestrator port
      ORCHESTRATOR_URL: `http://localhost:${BASE_PORT}`,
      // Phase servers need to know each other (for service mesh)
      PHASE1_URL: `http://localhost:${BASE_PORT + 1}`,
      PHASE3_URL: `http://localhost:${BASE_PORT + 2}`,
      PHASE5_URL: `http://localhost:${BASE_PORT + 3}`,
      PHASE6_URL: `http://localhost:${BASE_PORT + 4}`,
      PHASE8_URL: `http://localhost:${BASE_PORT + 5}`,
    },
    stdio: 'inherit'
  });

  proc.on('error', (err) => {
    console.error(`❌ ${config.name} failed to start:`, err);
  });

  processes.push({ name: config.name, proc });
}

console.log('\n✅ All services started!\n');
console.log('📊 Dashboard: https://ssi-dashboard-v7.vercel.app');
console.log(`🔧 Orchestrator API: http://localhost:${BASE_PORT}\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...\n');
  processes.forEach(({ name, proc }) => {
    console.log(`  Stopping ${name}...`);
    proc.kill('SIGTERM');
  });
  process.exit(0);
});
```

#### 3. Package.json Scripts

```json
{
  "scripts": {
    "automation": "node start-automation.js",
    "automation:dev": "BASE_PORT=3456 CHECKPOINT_MODE=manual node start-automation.js",
    "automation:prod": "BASE_PORT=3456 CHECKPOINT_MODE=full node start-automation.js"
  }
}
```

#### 4. Service Auto-Discovery

Each phase server reads from environment (no manual config):

```javascript
// services/phases/phase5-basket-server.cjs

// All config comes from environment (set by start-automation.js)
const PORT = process.env.PORT;  // Auto: 3459
const VFS_ROOT = process.env.VFS_ROOT;  // From .env.automation
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL;  // Auto: http://localhost:3456

console.log(`Phase 5 Server starting on port ${PORT}`);
console.log(`VFS Root: ${VFS_ROOT}`);
console.log(`Orchestrator: ${ORCHESTRATOR_URL}`);

// No other config needed!
```

### PM2 Alternative (Production-Style)

For users who want PM2 process management:

#### Auto-Generated Ecosystem File

```javascript
// generate-pm2-config.js

require('dotenv').config({ path: '.env.automation' });
const fs = require('fs');

const VFS_ROOT = process.env.VFS_ROOT;
const BASE_PORT = parseInt(process.env.BASE_PORT || '3456');
const CHECKPOINT_MODE = process.env.CHECKPOINT_MODE || 'gated';

const ecosystem = {
  apps: [
    {
      name: 'orchestrator',
      script: 'services/orchestration/orchestrator.cjs',
      env: {
        PORT: BASE_PORT,
        VFS_ROOT: VFS_ROOT,
        CHECKPOINT_MODE: CHECKPOINT_MODE,
        ORCHESTRATOR_URL: `http://localhost:${BASE_PORT}`,
        PHASE1_URL: `http://localhost:${BASE_PORT + 1}`,
        PHASE3_URL: `http://localhost:${BASE_PORT + 2}`,
        PHASE5_URL: `http://localhost:${BASE_PORT + 3}`,
        PHASE6_URL: `http://localhost:${BASE_PORT + 4}`,
        PHASE8_URL: `http://localhost:${BASE_PORT + 5}`,
      }
    },
    {
      name: 'phase1-server',
      script: 'services/phases/phase1-translation-server.cjs',
      env: {
        PORT: BASE_PORT + 1,
        VFS_ROOT: VFS_ROOT,
        ORCHESTRATOR_URL: `http://localhost:${BASE_PORT}`
      }
    },
    {
      name: 'phase5-server',
      script: 'services/phases/phase5-basket-server.cjs',
      env: {
        PORT: BASE_PORT + 3,
        VFS_ROOT: VFS_ROOT,
        ORCHESTRATOR_URL: `http://localhost:${BASE_PORT}`,
        WATCH_BRANCHES: true,
        AUTO_MERGE: true,
        STRIP_METADATA: true
      }
    }
    // ... other services
  ]
};

fs.writeFileSync(
  'ecosystem.config.cjs',
  `module.exports = ${JSON.stringify(ecosystem, null, 2)}`
);

console.log('✅ Generated ecosystem.config.cjs from .env.automation');
```

#### Usage

```bash
# Generate PM2 config from your .env.automation
npm run pm2:config

# Start with PM2
pm2 start ecosystem.config.cjs

# All services use your VFS_ROOT and auto-configured ports!
```

### Configuration Precedence

1. **Environment variables** (highest priority) - for CI/CD
2. **.env.automation** (developer override) - gitignored, personal settings
3. **Smart defaults** (fallback) - works out of the box

### What Developers Configure

| Setting | Required? | Default | Purpose |
|---------|-----------|---------|---------|
| `VFS_ROOT` | **YES** | (none) | Path to SSi_Course_Production folder |
| `CHECKPOINT_MODE` | No | `gated` | Phase automation mode |
| `BASE_PORT` | No | `3456` | Starting port (others auto-increment) |

**That's it!** Everything else auto-configures.

### Directory Structure

```
ssi-dashboard-v7-clean/
├── .env.example                  # Template
├── .env.automation              # Your personal config (gitignored)
├── start-automation.js          # Zero-config starter
├── generate-pm2-config.js       # PM2 config generator
├── package.json                 # npm scripts
├── services/
│   ├── orchestration/
│   │   └── orchestrator.cjs
│   └── phases/
│       ├── phase1-translation-server.cjs
│       ├── phase3-lego-extraction-server.cjs
│       ├── phase5-basket-server.cjs
│       ├── phase6-introduction-server.cjs
│       └── phase8-audio-server.cjs
└── scripts/
    ├── push_segment.cjs         # From debug-connectivity
    ├── watch_and_merge_branches.cjs
    └── strip_phase5_metadata.cjs
```

### Setup Instructions (README)

```markdown
## Setup

1. Clone repo:
   ```bash
   git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
   cd ssi-dashboard-v7-clean
   npm install
   ```

2. Configure your local path:
   ```bash
   cp .env.example .env.automation
   nano .env.automation
   ```

   Set `VFS_ROOT` to your SSi_Course_Production folder:
   ```bash
   VFS_ROOT=/Users/yourname/path/to/SSi_Course_Production
   ```

3. Start automation:
   ```bash
   npm run automation
   ```

Done! All 6 services auto-start with your config.
```

### Benefits

✅ **One-time setup** - Just set VFS_ROOT, everything else auto-configures
✅ **No port conflicts** - Auto-increment from BASE_PORT
✅ **No path confusion** - Single VFS_ROOT shared by all services
✅ **Works for Tom and Kai** - Each has their own .env.automation (gitignored)
✅ **Easy debugging** - `npm run automation` shows all logs in one terminal
✅ **PM2 option** - Generate ecosystem config from same .env.automation
✅ **Production ready** - Environment variables override .env.automation in CI/CD

### Migration Path

1. **Keep existing automation_server.cjs** as fallback
2. **Add start-automation.js** with new layered services
3. **Developers choose:**
   - Old way: `node automation_server.cjs` (10K line monolith)
   - New way: `npm run automation` (layered services)
4. **Once proven stable**, deprecate old automation_server.cjs

### Docker Alternative (Future)

For ultimate zero-config, wrap in Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  orchestrator:
    build: .
    ports: ["3456:3456"]
    volumes:
      - ${VFS_ROOT}:/vfs
    environment:
      - PORT=3456
      - VFS_ROOT=/vfs

  phase5-server:
    build: .
    ports: ["3459:3459"]
    volumes:
      - ${VFS_ROOT}:/vfs
    environment:
      - PORT=3459
      - VFS_ROOT=/vfs
      - ORCHESTRATOR_URL=http://orchestrator:3456
```

Then:
```bash
VFS_ROOT=/Users/tomcassidy/SSi/SSi_Course_Production docker-compose up
```

## Summary

**Configuration burden:**
- Before: 6 services × 10 config options = 60 things to configure ❌
- After: 1 config file × 1 required setting = 1 thing to configure ✅

**Developer experience:**
```bash
# Setup once
echo "VFS_ROOT=/my/path" > .env.automation

# Run always
npm run automation
```

That's it!
