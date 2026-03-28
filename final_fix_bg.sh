#!/bin/bash

# 1. Update dependencies to the official v3 library
echo "Ensuring @huggingface/transformers is installed..."
npm uninstall @xenova/transformers onnxruntime-web
npm install @huggingface/transformers

# 2. Update Tool.jsx with the most compatible model ID (onnx-community)
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
    setProgress(0);

    try {
      // Import from v3 package
      const { pipeline, env, RawImage } = await import("@huggingface/transformers");
      
      // Configuration for browser-only execution
      env.allowLocalModels = false;
      env.backends.onnx.wasm.proxy = false;

      // Use onnx-community version (most compatible with v3)
      const segmenter = await pipeline("image-segmentation", "onnx-community/RMBG-1.4", {
        progress_callback: (p) => {
          if (p.status === "progress") setProgress(Math.round(p.progress));
        },
      });

      // Load and process
      const img = await RawImage.fromURL(originalImage.url);
      const output = await segmenter(img);
      
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      const originalCanvasImage = await new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.src = originalImage.url;
      });
      
      ctx.drawImage(originalCanvasImage, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply the alpha mask from the model output
      for (let i = 0; i < output.mask.data.length; ++i) {
        imageData.data[i * 4 + 3] = output.mask.data[i];
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        setResultImage(URL.createObjectURL(blob));
        setProgress(100);
      }, "image/png");

    } catch (err) {
      console.error("DETAILED ERROR:", err);
      setError(`Error: ${err.message}. Check console for details.`);
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
          <p className="font-display font-bold text-xl text-ink">Click to upload image</p>
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
            <div className="p-4 border border-border rounded-lg bg-bg">
              <img src={originalImage.url} alt="Original" className="max-h-64 mx-auto" />
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
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-repeat">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto" />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted">Result will appear here</div>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={!resultImage}
              className="w-full bg-accent text-bg font-bold py-3 rounded-lg disabled:opacity-50"
            >
              Download PNG
            </button>
            {error && <p className="text-red-500 text-sm font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 3. Clean Next.js cache and restart
echo "Cleaning cache..."
rm -rf .next
echo "Done! Run 'npm run dev' to start."
