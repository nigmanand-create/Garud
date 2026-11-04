/** Copy to ecosystem.config.js and adjust paths/env. */
module.exports = {
  apps: [
    {
      name: 'garudhub-api',
      cwd: '/home/deploy/Garud/backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_restarts: 10,
      exp_backoff_restart_delay: 2000,
    },
    {
      name: 'garudhub-web',
      cwd: '/home/deploy/Garud/frontend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_URL: 'http://127.0.0.1:3000',
      },
      max_restarts: 10,
      exp_backoff_restart_delay: 2000,
    },
  ],
};
