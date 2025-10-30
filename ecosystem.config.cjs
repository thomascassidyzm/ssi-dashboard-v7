/**
 * PM2 Ecosystem Configuration
 *
 * Manages automation server, dashboard UI, and ngrok tunnel
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 save                    # Save current processes
 *   pm2 startup                 # Auto-start on system boot
 */

module.exports = {
  apps: [
    {
      name: 'automation-server',
      script: 'automation_server.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3456
      },
      error_file: 'logs/automation-server-error.log',
      out_file: 'logs/automation-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
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
    {
      name: 'ngrok-tunnel',
      script: 'ngrok',
      args: 'http --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev 3456',
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
