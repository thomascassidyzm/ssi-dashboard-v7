const path = require('path');
require('dotenv').config();

const VFS_ROOT = path.join(__dirname, 'public/vfs/courses');

// Each developer sets NGROK_DOMAIN in their local .env file
// Falls back to popty.ngrok.app if not set
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'popty.ngrok.app';

// Machine-aware memory limits based on available RAM
// Tom's machine (24GB) can run 2-3 courses in parallel; SSi/Kai (8GB) need tight limits
const TOTAL_RAM_GB = parseInt(process.env.MACHINE_RAM_GB || '8', 10);
const isLargeMachine = TOTAL_RAM_GB >= 16;
const MEM_LIGHT  = isLargeMachine ? '4G' : '2G';   // orchestrator, production-api, course-builder
const MEM_HEAVY  = isLargeMachine ? '6G' : '3G';   // phase8-audio, phase9-manifest
const HEAP_LIMIT = isLargeMachine ? '8192' : '4096'; // V8 max-old-space-size

module.exports = {
  apps: [
    {
      name: 'orchestrator',
      script: 'services/orchestration/orchestrator.cjs',
      env: {
        PORT: 3456,
        VFS_ROOT
      },
      watch: false,
      autorestart: true,
      max_restarts: 3,
      max_memory_restart: MEM_LIGHT
    },
    // DEPRECATED in v14 - Replaced by course-builder (port 3471)
    // {
    //   name: 'phase1-translation',
    //   script: 'services/phases/phase1-translation/server.cjs',
    //   env: { PORT: 3457, VFS_ROOT },
    //   watch: false, autorestart: true, max_restarts: 3
    // },
    // {
    //   name: 'phase2-conflict',
    //   script: 'services/phases/phase2-conflict-resolution/server.cjs',
    //   env: { PORT: 3458, VFS_ROOT },
    //   watch: false, autorestart: true, max_restarts: 3
    // },
    // {
    //   name: 'phase3-basket',
    //   script: 'services/phases/phase3-basket-generation/server.cjs',
    //   env: { PORT: 3459, VFS_ROOT },
    //   watch: false, autorestart: true, max_restarts: 3
    // },
    {
      name: 'production-api',
      script: 'services/production-api.cjs',
      env: {
        PORT: 3470,
        VFS_ROOT
      },
      watch: false,
      autorestart: true,
      max_restarts: 3,
      max_memory_restart: MEM_LIGHT
    },
    {
      name: 'phase8-audio',
      script: 'services/phases/phase8-audio-v13.cjs',
      env: {
        PORT: 3465,
        VFS_ROOT
      },
      node_args: `--max-old-space-size=${HEAP_LIMIT}`,
      watch: false,
      autorestart: true,
      max_restarts: 3,
      max_memory_restart: MEM_HEAVY
    },
    {
      name: 'phase9-manifest',
      script: 'services/phases/phase9-manifest-compiler.cjs',
      env: {
        PORT: 3466,
        VFS_ROOT
      },
      node_args: `--max-old-space-size=${HEAP_LIMIT}`,
      watch: false,
      autorestart: true,
      max_restarts: 3,
      max_memory_restart: MEM_HEAVY
    },
    {
      name: 'course-builder',
      script: 'services/course-builder-api.cjs',
      env: {
        PORT: 3471,
        VFS_ROOT
      },
      node_args: `--max-old-space-size=${HEAP_LIMIT}`,
      watch: false,
      autorestart: true,
      max_restarts: 3,
      max_memory_restart: MEM_LIGHT
    },
    {
      name: 'ngrok',
      script: 'ngrok',
      args: `http --url=${NGROK_DOMAIN} 3470 --log=stdout`,  // Production API main entry point (was 3456)
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,  // Wait 5 seconds before restart
      exp_backoff_restart_delay: 1000  // Exponential backoff on repeated failures
    },
    {
      name: 'keep-awake',
      script: 'scripts/keep-awake.sh',
      interpreter: 'bash',
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'cleanup-terminals',
      script: 'scripts/cleanup-terminals.sh',
      interpreter: 'bash',
      cron_restart: '*/10 * * * *',  // Run every 10 minutes
      autorestart: false,            // Don't restart between crons
      watch: false
    }
  ]
};
