/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // This exact alias completely fixes the "import.meta" Vercel deployment error
    // by stopping Webpack from trying to bundle the Node-specific ONNX files.
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};
export default nextConfig;
