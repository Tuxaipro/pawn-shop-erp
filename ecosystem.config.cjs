module.exports = {
  apps: [
    {
      name: 'pawn-erp-api',
      cwd: '/var/www/pawn-shop-erp/pawn-ts',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pawn-erp/api-error.log',
      out_file: '/var/log/pawn-erp/api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
