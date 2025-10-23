module.exports = {
  apps: [
    {
      name: 'automation-server',
      script: './automation_server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3456
      },
      error_file: './logs/automation-server-error.log',
      out_file: './logs/automation-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart strategy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'ngrok-tunnel',
      script: 'ngrok',
      args: 'http 3456 --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev --log=stdout',
      autorestart: true,
      watch: false,
      error_file: './logs/ngrok-error.log',
      out_file: './logs/ngrok-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart strategy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
}
