/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, path: false };

    // Avoid bundling WebGPU variant that breaks minification in this setup.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };

    // Ensure onnxruntime ESM bundle is parsed correctly during production builds.
    config.module.rules.push({
      test: /ort(\.webgpu)?\.bundle\.min\.m?js$/,
      type: "javascript/esm",
    });

    // Keep onnxruntime out of the server bundle (tool is client-only).
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-web"];
    }

    return config;
  },
};

export default nextConfig;
