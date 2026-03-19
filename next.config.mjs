/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    // Ignore optional webgpu backend that's not installed
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };

    // Exclude onnxruntime-web from webpack processing
    config.externals = config.externals || [];
    config.externals.push('onnxruntime-web');

    // Add rule to ignore onnxruntime-web files
    config.module.rules.push({
      test: /ort\.node\.min\.mjs$/,
      use: 'null-loader'
    });

    return config;
  },
};

export default nextConfig;