#!/bin/bash

# 1. Install official library and null-loader for webpack
echo "Installing dependencies..."
npm install @huggingface/transformers null-loader

# 2. Create the local model directory
echo "Creating local model storage..."
mkdir -p public/models/rmbg-1.4/onnx

# 3. Download the model files directly to your public folder
# This bypasses Hugging Face CORS and Authorization errors
echo "Downloading model files (approx. 45MB)..."
curl -L -o public/models/rmbg-1.4/config.json https://huggingface.co/onnx-community/RMBG-1.4/resolve/main/config.json
curl -L -o public/models/rmbg-1.4/preprocessor_config.json https://huggingface.co/onnx-community/RMBG-1.4/resolve/main/preprocessor_config.json
curl -L -o public/models/rmbg-1.4/onnx/model_quantized.onnx https://huggingface.co/onnx-community/RMBG-1.4/resolve/main/onnx/model_quantized.onnx

# 4. Update Tool.jsx to use the high-level 'background-removal' task and LOCAL files
echo "Updating src/tools/bg-remover/Tool.jsx..."
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

  useEffect(() => {
    return () => {
      if (originalImage?.url) URL.revokeObjectURL(originalImage.url);
      if (resultImage) URL.revokeObjectURL(resultImage);
    };
  }, [originalImage, resultImage]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
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
    setProgress(0);

    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      
      // OPTIMIZATION: Tell the library to look in your LOCAL public folder
      env.allowLocalModels = true;
      env.localModelPath = "/models/";
      env.backends.onnx.wasm.proxy = false;

      // Use the high-level 'background-removal' task which is more stable
      const segmenter = await pipeline("background-removal", "rmbg-1.4", {
        progress_callback: (p) => {
          if (p.status === "progress") setProgress(Math.round(p.progress));
        },
      });

      // The background-removal pipeline returns the final image directly
      const output = await segmenter(originalImage.url);
      const blob = await output.toBlob();
      
      setResultImage(URL.createObjectURL(blob));
      setProgress(100);

    } catch (err) {
      console.error("Local Model Error:", err);
      setError(`Failed to load local model: ${err.message}. Ensure files are in public/models/rmbg-1.4/`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "no-bg.png";
    a.click();
  };

  return (
    <div className="space-y-8">
      {!originalImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-16 text-center cursor-pointer hover:border-ink transition-colors"
        >
          <div className="text-5xl mb-4">Ì∂ºÔ∏è</div>
          <p className="font-display font-bold text-xl text-ink">Upload image to remove background</p>
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
            <div className="chrome-card p-4 bg-bg">
              <img src={originalImage.url} alt="Original" className="max-h-64 mx-auto object-contain" />
            </div>
            <button
              onClick={removeBackground}
              disabled={isProcessing}
              className="w-full bg-ink text-bg font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {isProcessing ? `Processing... ${progress}%` : "Remove Background"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="chrome-card p-4 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted font-mono">Result Preview</div>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={!resultImage}
              className="w-full bg-accent text-bg font-bold py-3 rounded-lg disabled:opacity-50"
            >
              Download Transparent PNG
            </button>
            {error && <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 5. Clear Next.js cache and restart
echo "Cleaning cache..."
rm -rf .next
echo "Done! Run 'npm run dev' to start."
