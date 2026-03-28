#!/bin/bash

# 1. Update Tool.jsx with memory leak fixes and optimized API calls
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useRef, useState, useEffect } from "react";

export default function BgRemoverTool() {
  const fileInputRef = useRef(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // OPTIMIZATION: Prevent memory leaks by revoking object URLs on unmount
  useEffect(() => {
    return () => {
      if (originalImage?.url) URL.revokeObjectURL(originalImage.url);
      if (resultImage) URL.revokeObjectURL(resultImage);
    };
  }, [originalImage, resultImage]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    if (originalImage?.url) URL.revokeObjectURL(originalImage.url);
    if (resultImage) URL.revokeObjectURL(resultImage);

    const url = URL.createObjectURL(file);
    setOriginalImage({ file, url });
    setResultImage(null);
    setError(null);
    setProgress(0);
  };

  const removeBackground = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      const { remove } = await import("@bunnio/rembg-web");
      const ort = await import("onnxruntime-web");

      // Version must strictly match package.json to prevent WASM crashes
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";

      setProgress(30);

      // OPTIMIZATION: Using modelName directly allows the library to find the 
      // local file in /public/models/ automatically.
      const blob = await remove(originalImage.file, {
        modelName: "silueta",
        onProgress: (info) => {
          if (typeof info?.progress === "number") {
            setProgress(Math.max(30, Math.min(Math.round(info.progress), 95)));
          }
        },
      });

      setResultImage(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error("Background removal error:", err);
      setError(
        err.message || "Background removal failed. Ensure /models/silueta.onnx exists."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "background-removed.png";
    a.click();
  };

  return (
    <div className="space-y-8">
      {!originalImage && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 sm:p-16 text-center cursor-pointer hover:border-ink transition-colors"
        >
          <div className="text-5xl mb-4">⬆</div>
          <p className="font-display font-bold text-xl text-ink">Drop an image to remove its background</p>
          <p className="text-muted text-sm mt-2">PNG, JPG, WEBP — click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {originalImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="chrome-card">
              <div className="chrome-bar">
                <div className="chrome-dot" />
                <div className="chrome-dot" />
                <span className="text-xs font-mono text-muted ml-2">original</span>
              </div>
              <div className="p-4 bg-bg">
                <img src={originalImage.url} alt="Original" className="w-full h-64 object-contain" />
              </div>
            </div>

            <button
              onClick={removeBackground}
              disabled={isProcessing}
              className="w-full bg-ink text-bg font-display font-bold py-3.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isProcessing ? `Removing… ${progress}%` : "Remove Background"}
            </button>

            <button
              onClick={() => {
                setOriginalImage(null);
                setResultImage(null);
                setError(null);
                setProgress(0);
              }}
              className="w-full border border-border text-ink font-mono py-2.5 rounded-lg hover:border-ink transition-colors"
            >
              Choose Another Image
            </button>
          </div>

          <div className="space-y-4">
            <div className="chrome-card">
              <div className="chrome-bar">
                <div className="chrome-dot" />
                <div className="chrome-dot" />
                <span className="text-xs font-mono text-muted ml-2">result</span>
              </div>
              <div className="p-4 bg-[linear-gradient(45deg,#e8e5de_25%,#f2f0eb_25%,#f2f0eb_50%,#e8e5de_50%,#e8e5de_75%,#f2f0eb_75%,#f2f0eb_100%)] bg-[length:24px_24px]">
                {resultImage ? (
                  <img src={resultImage} alt="Background removed result" className="w-full h-64 object-contain" />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted text-sm font-mono">
                    Processed image will appear here
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={!resultImage}
              className="w-full bg-accent text-bg font-display font-bold py-3.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Download PNG
            </button>

            {error && <p className="text-sm text-red-600 font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 2. Update next.config.mjs with crypto fallback
cat << 'INNER_EOF' > next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      path: false,
      crypto: false 
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };

    config.module.rules.push({
      test: /ort(\.webgpu)?\.bundle\.min\.m?js$/,
      type: "javascript/esm",
    });

    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-web"];
    }

    return config;
  },
};

export default nextConfig;
INNER_EOF

# 3. Update package.json to lock ONNX and add security overrides
node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkg.dependencies["onnxruntime-web"] = "1.18.0";
  pkg.overrides = {
    "brace-expansion": "^2.0.1",
    "minimatch": "^9.0.5",
    "glob": "^10.4.5"
  };
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
'

# 4. Install updates and clean up vulnerabilities
echo "Updating dependencies and applying security patches..."
npm install next@latest eslint-config-next@latest
npm install
npm audit fix

# 5. Ensure the model is downloaded
node scripts/fetch-rembg-model.mjs

echo "Update complete. Run 'npm run dev' to test."
