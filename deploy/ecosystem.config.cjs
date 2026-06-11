const path = require('path');

const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'dm-api',
      cwd: path.join(root, 'api'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dm-api-worker',
      cwd: path.join(root, 'api'),
      script: 'dist/workers/download.worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dm-image-api',
      cwd: path.join(root, 'image-api'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dm-file-converter',
      cwd: path.join(root, 'file-converter'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dm-web',
      cwd: path.join(root, 'web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
