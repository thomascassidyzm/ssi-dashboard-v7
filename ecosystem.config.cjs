const path = require('path');

const VFS_ROOT = path.join(__dirname, 'public/vfs/courses');

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
      max_restarts: 3
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
      max_restarts: 3
    },
    {
      name: 'phase8-audio',
      script: 'services/phases/phase8-audio-v13.cjs',
      env: {
        PORT: 3465,
        VFS_ROOT
      },
      node_args: '--max-old-space-size=8192',
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'phase9-manifest',
      script: 'services/phases/phase9-manifest-compiler.cjs',
      env: {
        PORT: 3466,
        VFS_ROOT
      },
      node_args: '--max-old-space-size=8192',
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'course-builder',
      script: 'services/course-builder-api.cjs',
      env: {
        PORT: 3471,
        VFS_ROOT
      },
      node_args: '--max-old-space-size=8192',
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'ngrok',
      script: 'ngrok',
      args: 'http 3456 --log=stdout',
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
    }
  ]
};
