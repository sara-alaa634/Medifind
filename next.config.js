/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Exclude problematic packages from webpack bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Ignore node-pre-gyp and other native modules
    config.externals = config.externals || [];
    config.externals.push({
      '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
    });

    // Ignore specific problematic files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.html$/,
      loader: 'ignore-loader',
    });

    return config;
  },
}

module.exports = nextConfig
