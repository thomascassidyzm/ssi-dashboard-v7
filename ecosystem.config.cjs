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
    {
      name: 'phase1-translation',
      script: 'services/phases/phase1-translation/server.cjs',
      env: {
        PORT: 3457,
        VFS_ROOT
      },
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'phase2-conflict',
      script: 'services/phases/phase2-conflict-resolution/server.cjs',
      env: {
        PORT: 3458,
        VFS_ROOT
      },
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
    {
      name: 'phase3-basket',
      script: 'services/phases/phase3-basket-generation/server.cjs',
      env: {
        PORT: 3459,
        VFS_ROOT
      },
      watch: false,
      autorestart: true,
      max_restarts: 3
    },
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
    }
  ]
};
