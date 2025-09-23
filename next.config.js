/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  
  // Performance optimizations (simplified for Next.js 15)
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },
  
  // Webpack optimizations (minimal for compatibility)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer for production builds only
    if (process.env.ANALYZE === 'true' && !dev) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      );
    }

    return config;
  },
  
  // Power optimizations
  poweredByHeader: false,
}

module.exports = nextConfig 