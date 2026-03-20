/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false };

    // Fix onnxruntime-web conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };

    // Ensure onnxruntime ESM bundle is parsed correctly during production builds.
    config.module.rules.push({
      test: /ort\.bundle\.min\.m?js$/,
      type: "javascript/esm",
    });

    // Exclude onnxruntime from server bundle entirely
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-web"];
    }

    return config;
  },
};

export default nextConfig;
