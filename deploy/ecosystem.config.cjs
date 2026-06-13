const path = require('path');

const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'video-api',
      cwd: path.join(root, 'video-api'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'video-worker',
      cwd: path.join(root, 'video-api'),
      script: 'dist/workers/video.worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'image-api',
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
      name: 'image-worker',
      cwd: path.join(root, 'image-api'),
      script: 'dist/workers/image.worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'converter-api',
      cwd: path.join(root, 'converter-api'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'converter-worker',
      cwd: path.join(root, 'converter-api'),
      script: 'dist/workers/converter.worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'web',
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
