import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
    const imageApiTarget =
      process.env.IMAGE_API_PROXY_TARGET ?? 'http://localhost:3100';
    const fileConverterTarget =
      process.env.FILE_CONVERTER_PROXY_TARGET ?? 'http://localhost:3200';

    // Single API gateway in dev: /api/<service>/* → <service>/api/v1/*
    return [
      {
        source: '/api/videos/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
      {
        source: '/api/images/:path*',
        destination: `${imageApiTarget}/api/v1/:path*`,
      },
      {
        source: '/api/convert/:path*',
        destination: `${fileConverterTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
