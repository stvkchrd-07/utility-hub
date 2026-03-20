/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false };
    
    // Fix onnxruntime-web conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };

    // Exclude onnxruntime from server bundle entirely
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-web"];
    }

    return config;
  },
};

export default nextConfig;