import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nonaktifkan cache Webpack di development agar selalu fresh
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
