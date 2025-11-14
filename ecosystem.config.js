/**
 * PM2 Ecosystem Configuration
 *
 * This file defines the processes PM2 should manage for the SSi automation system.
 *
 * IMPORTANT: This file is SHARED (committed to git) and contains NO personal paths.
 * Personal configuration goes in .env.automation (gitignored).
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup (run once to start PM2 on boot)
 */

module.exports = {
  apps: [
    {
      // =======================================================================
      // SSi Automation Server
      // =======================================================================
      name: 'ssi-automation',
      script: './automation_server.cjs',

      // Working directory (relative to this file)
      cwd: __dirname,

      // Interpreter
      interpreter: 'node',

      // Watch for changes (auto-restart on code changes)
      watch: true,

      // Ignore these paths when watching
      ignore_watch: [
        'node_modules',
        'public/vfs',
        'logs',
        '.git',
        '*.log',
        'phase5_outputs'
      ],

      // Auto-restart if process crashes
      autorestart: true,

      // Max memory before restart (optional safety)
      max_memory_restart: '500M',

      // Restart delay
      restart_delay: 1000,

      // Log configuration
      error_file: './logs/automation-error.log',
      out_file: './logs/automation-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Environment variables (these are DEFAULTS - override in .env.automation)
      env: {
        NODE_ENV: 'development',
        PORT: 3456,
      },

      // Production environment (use: pm2 start ecosystem.config.js --env production)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3456,
      }
    },

    // Uncomment this section if you want PM2 to manage ngrok
    // (Alternative: run ngrok separately as you currently do)
    /*
    {
      // =======================================================================
      // Ngrok Tunnel
      // =======================================================================
      name: 'ngrok-tunnel',
      script: 'ngrok',
      args: 'http --domain=YOUR_DOMAIN.ngrok-free.dev 3456',

      // Watch disabled for ngrok
      watch: false,

      // Auto-restart
      autorestart: true,

      // Logs
      error_file: './logs/ngrok-error.log',
      out_file: './logs/ngrok-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
    */
  ]
};
