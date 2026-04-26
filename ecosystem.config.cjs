module.exports = {
  apps: [
    {
      name: 'nostr-widgets',
      script: 'apps/server/dist/index.js',
      cwd: '/var/www/nostr-widgets',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: '3004',
      },
      out_file: '/var/log/pm2/nostr-widgets.out.log',
      error_file: '/var/log/pm2/nostr-widgets.err.log',
      time: true,
    },
  ],
};
