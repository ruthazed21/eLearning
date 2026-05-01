module.exports = {
  apps: [
    {
      name: 'elearning-api',
      script: './server.js',
      cwd: __dirname,

      // Cluster mode — one worker per CPU core
      instances: 'max',
      exec_mode: 'cluster',

      // Auto-restart on failure
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Log file paths
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
