/**
 * PM2 Ecosystem Configuration
 *
 * SSi Dashboard v7 - Complete Server Architecture (APML v10.1)
 *
 * === PORT ASSIGNMENTS ===
 * 3456 - Orchestrator (main coordination)
 * 3457 - Phase 1: Translation + LEGO Extraction
 * 3458 - Phase 2: Conflict Resolution
 * 3459 - Phase 3: Basket Generation
 * 3462 - Progress API
 * 3463 - ngrok Proxy
 * 3464 - Phase 7: Manifest Compilation
 * 3465 - Phase 8: Audio/TTS Generation
 * 5173 - Dashboard UI (Vite dev server)
 *
 * === USAGE ===
 * Start all:       pm2 start ecosystem.config.cjs
 * Start core:      pm2 start ecosystem.config.cjs --only ssi-orchestrator,phase3-baskets
 * Start phases:    pm2 start ecosystem.config.cjs --only phase1-translation,phase2-conflict,phase3-baskets
 * Stop all:        pm2 stop all
 * Restart all:     pm2 restart all
 * View logs:       pm2 logs
 * View specific:   pm2 logs phase8-audio
 * Status:          pm2 list
 * Save config:     pm2 save
 * Auto-start:      pm2 startup
 */

// Load environment variables from .env file
require('dotenv').config();

// VFS_ROOT - used by all phase servers
const VFS_ROOT = process.env.VFS_ROOT || require('path').join(__dirname, 'public/vfs/courses');

module.exports = {
  apps: [
    // ===========================================
    // ORCHESTRATOR (Port 3456) - Main Coordinator
    // ===========================================
    {
      name: 'ssi-orchestrator',
      script: 'services/orchestration/orchestrator.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3456,
        VFS_ROOT: VFS_ROOT,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION || 'eu-west-1',
        S3_BUCKET: process.env.S3_BUCKET || 'popty-bach-lfs',
        S3_AUDIO_BUCKET: process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
      error_file: 'logs/orchestrator-error.log',
      out_file: 'logs/orchestrator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PHASE 1: Translation + LEGO Extraction (Port 3457)
    // ===========================================
    {
      name: 'phase1-translation',
      script: 'services/phases/phase1-translation/server.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3457,
        VFS_ROOT: VFS_ROOT,
        SERVICE_NAME: 'Phase 1 (Translation)',
        ORCHESTRATOR_URL: 'http://localhost:3456',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
      error_file: 'logs/phase1-error.log',
      out_file: 'logs/phase1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PHASE 2: Conflict Resolution (Port 3458)
    // ===========================================
    {
      name: 'phase2-conflict',
      script: 'services/phases/phase1-lego-extraction/server.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3458,
        VFS_ROOT: VFS_ROOT,
        SERVICE_NAME: 'Phase 2 (Conflict Resolution)',
        ORCHESTRATOR_URL: 'http://localhost:3456',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
      error_file: 'logs/phase2-error.log',
      out_file: 'logs/phase2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PHASE 3: Basket Generation (Port 3459)
    // ===========================================
    {
      name: 'phase3-baskets',
      script: 'services/phases/phase3-basket-generation/server.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3459,
        VFS_ROOT: VFS_ROOT,
        SERVICE_NAME: 'Phase 3 (Baskets)',
        ORCHESTRATOR_URL: 'http://localhost:3456',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      },
      error_file: 'logs/phase3-error.log',
      out_file: 'logs/phase3-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PHASE 7: Manifest Compilation (Port 3464)
    // ===========================================
    {
      name: 'phase7-manifest',
      script: 'services/phases/manifest-compilation/server.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3464,
        VFS_ROOT: VFS_ROOT,
        SERVICE_NAME: 'Phase 7 (Manifest)',
        ORCHESTRATOR_URL: 'http://localhost:3456'
      },
      error_file: 'logs/phase7-error.log',
      out_file: 'logs/phase7-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PHASE 8: Audio/TTS Generation (Port 3465)
    // ===========================================
    {
      name: 'phase8-audio',
      script: 'services/phases/phase8-audio-generator.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',  // Audio processing needs more memory
      env: {
        NODE_ENV: 'development',
        PORT: 3465,
        VFS_ROOT: VFS_ROOT,
        SERVICE_NAME: 'Phase 8 (Audio)',
        ORCHESTRATOR_URL: 'http://localhost:3456',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION || 'eu-west-1',
        AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY
      },
      error_file: 'logs/phase8-error.log',
      out_file: 'logs/phase8-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // DASHBOARD UI (Port 5173)
    // ===========================================
    {
      name: 'dashboard-ui',
      script: 'npm',
      args: 'run dev',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        VITE_API_BASE_URL: 'http://localhost:3456'
      },
      error_file: 'logs/dashboard-error.log',
      out_file: 'logs/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // PROGRESS API (Port 3462)
    // ===========================================
    {
      name: 'progress-api',
      script: 'services/api/progress-tracker.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        PORT: 3462,
        VFS_ROOT: require('path').join(__dirname, 'public/vfs/courses')
      },
      error_file: 'logs/progress-api-error.log',
      out_file: 'logs/progress-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // NGROK PROXY (Port 3463)
    // ===========================================
    {
      name: 'ngrok-proxy',
      script: 'services/api/ngrok-proxy.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        PORT: 3463
      },
      error_file: 'logs/ngrok-proxy-error.log',
      out_file: 'logs/ngrok-proxy-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // ===========================================
    // NGROK TUNNEL (external)
    // ===========================================
    {
      name: 'ngrok-tunnel',
      script: 'ngrok',
      args: 'http --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev 3463 --log=stdout',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: 'logs/ngrok-error.log',
      out_file: 'logs/ngrok-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
