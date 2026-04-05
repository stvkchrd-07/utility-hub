#!/bin/bash
echo "Pivoting Background Remover to Hugging Face API..."

# 1. Remove the heavy local AI library and worker file
npm uninstall @huggingface/transformers
rm -f src/tools/bg-remover/worker.js

# 2. Reset next.config.mjs to standard (we no longer need Webpack WASM hacks!)
cat << 'INNER_EOF' > next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
INNER_EOF

# 3. Create the secure backend API route
mkdir -p src/app/api/remove-bg
cat << 'INNER_EOF' > src/app/api/remove-bg/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Send the image to Hugging Face's Inference API securely
    const response = await fetch(
      "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN}` },
        method: "POST",
        body: image,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API Error:", errorText);
      
      // Handle model loading state (HF sometimes takes a few seconds to wake up the model)
      if (response.status === 503 && errorText.includes("currently loading")) {
         throw new Error("Model is waking up. Please try again in 15 seconds.");
      }
      
      throw new Error("Hugging Face API failed or rate limited.");
    }

    // Return the transparent PNG back to the frontend
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: { 'Content-Type': 'image/png' }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
INNER_EOF

# 4. Update the Frontend Tool to use the API
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useState } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

export default function BgRemoverTool() {
  const { createUrl } = useBlobManager();
  
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setOriginalImage({ file, url: createUrl(file) });
    setResultImage(null);
    setError(null);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', originalImage.file);

      // Call our secure Next.js API Route
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process image.");
      }

      const blob = await response.blob();
      setResultImage(createUrl(blob));
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "utility-hub-bg-removed.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {!originalImage && (
        <Dropzone 
          onFile={handleFile} 
          accept="image/*" 
          title="Upload image to remove background" 
          subtitle="Powered by Hugging Face API"
        />
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
              className="w-full bg-ink text-bg font-bold py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {isProcessing ? "Processing via API..." : "Remove Background"}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-muted font-mono text-center px-4">
                  {isProcessing ? (
                    <span className="animate-pulse">Uploading to Hugging Face... ✨</span>
                  ) : (
                    "Result Preview"
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={handleDownload} 
              disabled={!resultImage} 
              className="w-full bg-accent text-bg font-bold py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              Download Transparent PNG
            </button>
            {error && <p className="text-red-500 text-xs mt-2 font-mono break-words">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 5. Create local environment file template
cat << 'INNER_EOF' > .env.local
# Paste your Hugging Face Access Token here (starts with hf_...)
HF_API_TOKEN=your_token_here
INNER_EOF

echo "Done! The API architecture is set up."
