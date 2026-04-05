/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fixes the Vercel build error by ignoring the Node.js AI bindings
    // since we only use the browser (WASM) version.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
    };
    
    return config;
  },
};

export default nextConfig;
