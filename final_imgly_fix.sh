#!/bin/bash

# 1. Clean up the corrupted files and old library
echo "Cleaning up corrupted models and old libraries..."
rm -rf public/models/rmbg-1.4
npm uninstall @huggingface/transformers

# 2. Install the robust IMGLY background removal library
echo "Installing @imgly/background-removal..."
npm install @imgly/background-removal

# 3. Update Tool.jsx to use IMGLY (Much simpler and more reliable)
echo "Updating src/tools/bg-remover/Tool.jsx..."
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import removeBackground from "@imgly/background-removal";

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

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // IMGLY handles all WASM and Model loading internally via reliable CDNs
      const blob = await removeBackground(originalImage.file, {
        progress: (key, current, total) => {
          // Calculate overall progress based on download and processing steps
          if (total > 0) {
            const percentage = Math.round((current / total) * 100);
            setProgress(Math.min(percentage, 99)); // Keep at 99% until fully done
          }
        }
      });

      if (resultImage) URL.revokeObjectURL(resultImage);
      setResultImage(URL.createObjectURL(blob));
      setProgress(100);

    } catch (err) {
      console.error("Background Removal Error:", err);
      setError(`Failed to process image: ${err.message}`);
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
          <div className="text-5xl mb-4">✨</div>
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
            <div className="p-4 border border-border rounded-lg bg-bg">
              <img src={originalImage.url} alt="Original" className="max-h-64 mx-auto object-contain" />
            </div>
            <button
              onClick={handleRemoveBackground}
              disabled={isProcessing}
              className="w-full bg-ink text-bg font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {isProcessing ? `Processing... ${progress}%` : "Remove Background"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
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
              Download PNG
            </button>
            {error && <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 4. Clean Next.js cache and restart
echo "Cleaning cache..."
rm -rf .next
echo "Done! Run 'npm run dev' to test the new, unblocked background remover."
