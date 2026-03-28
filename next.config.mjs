/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Prevent Webpack from trying to bundle binary files meant for server-side ONNX
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      path: false,
    };

    // Ignore binary .node files which cause the 'Unexpected character' error
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;
