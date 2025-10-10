module.exports = {
  apps: [
    {
      name: 'ssi-automation',
      script: 'automation_server.cjs',
      cwd: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3456
      },
      error_file: '/Users/tomcassidy/.pm2/logs/ssi-automation-error.log',
      out_file: '/Users/tomcassidy/.pm2/logs/ssi-automation-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'ssi-ngrok',
      script: '/bin/bash',
      args: '-c "ngrok http 3456 --url https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev --log stdout"',
      cwd: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean',
      autorestart: true,
      watch: false,
      error_file: '/Users/tomcassidy/.pm2/logs/ssi-ngrok-error.log',
      out_file: '/Users/tomcassidy/.pm2/logs/ssi-ngrok-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
