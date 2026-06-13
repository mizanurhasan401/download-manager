import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
    const imageApiTarget =
      process.env.IMAGE_API_PROXY_TARGET ?? 'http://localhost:3100';
    const fileConverterTarget =
      process.env.FILE_CONVERTER_PROXY_TARGET ?? 'http://localhost:3200';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${imageApiTarget}/:path*`,
      },
      {
        source: '/convert/:path*',
        destination: `${fileConverterTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
