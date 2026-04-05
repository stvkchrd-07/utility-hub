/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Ignore Node-specific modules when bundling for the browser
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    
    // CRITICAL FIX: Stops Next.js/Vercel from crashing on ONNX runtime's import.meta syntax
    config.module.parser = {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        importMeta: false,
      },
    };
    
    return config;
  },
};
export default nextConfig;
