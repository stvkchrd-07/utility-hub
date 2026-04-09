#!/bin/bash
echo "Connecting UtilityHub to Custom Hugging Face Microservice..."

# 1. Rebuild the Backend API to forward requests to your custom Python server
cat << 'INNER_EOF' > src/app/api/remove-bg/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Convert Base64 text back into a binary Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Create a native FormData payload matching what FastAPI expects (UploadFile)
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" });
    formData.append("file", blob, "upload.jpg");

    // Read the connection details from environment variables
    const AI_ENGINE_URL = process.env.HF_CUSTOM_API_URL;
    const SECRET_KEY = process.env.HF_CUSTOM_API_SECRET;

    if (!AI_ENGINE_URL || !SECRET_KEY) {
       return NextResponse.json({ error: "Server misconfiguration. API URL or Secret missing." }, { status: 500 });
    }

    // Forward the file securely to your Hugging Face Space
    const response = await fetch(AI_ENGINE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: formData
    });

    // Handle Custom API Errors and Cold Starts
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Custom AI Engine Rejected:", response.status, errorText);
      
      // 503 or 504 means your Hugging Face Space is booting up from sleep
      if (response.status === 503 || response.status === 504) {
         return NextResponse.json({ error: "WAKING_UP" }, { status: 503 });
      }
      if (response.status === 401) {
         return NextResponse.json({ error: "Unauthorized: Secret Key mismatch." }, { status: 401 });
      }
      
      return NextResponse.json({ error: `AI Engine Error: ${errorText}` }, { status: response.status });
    }

    // Return the transparent PNG bytes directly to the frontend
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: { 
        'Content-Type': 'image/png',
        'Content-Length': arrayBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    // Intercept socket drops during Hugging Face Docker cold starts
    if (error.message.includes('terminated') || error.message.includes('socket') || error.message.includes('fetch failed')) {
       return NextResponse.json({ error: "WAKING_UP" }, { status: 503 });
    }
    console.error("Critical Backend Crash:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
  }
}
INNER_EOF

# 2. Rebuild the Frontend Tool to elegantly handle Hugging Face cold boots
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useState } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = (error) => reject(error);
});

export default function BgRemoverTool() {
  const { createUrl } = useBlobManager();
  
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setError("Image is too large. Please use an image under 4.5MB.");
      return;
    }
    setOriginalImage({ file, url: createUrl(file) });
    setResultImage(null);
    setError(null);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    setStatusText("Preparing image...");
    
    try {
      const base64Data = await fileToBase64(originalImage.file);
      const payload = JSON.stringify({ 
        imageBase64: base64Data,
        mimeType: originalImage.file.type
      });

      let attempt = 0;
      const maxAttempts = 6; // Allow ~1.5 minutes for a full Docker boot
      let finalBlob = null;

      while (attempt < maxAttempts) {
        attempt++;
        setStatusText(attempt === 1 ? "Sending to Custom AI Engine..." : `Waking up AI Engine... (Attempt ${attempt}/${maxAttempts})`);
        
        const response = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          
          if (response.status === 503 || errData.error === "WAKING_UP") {
            if (attempt < maxAttempts) {
              setStatusText("AI Server is booting up... please wait ~15s ⏳");
              await new Promise(res => setTimeout(res, 15000));
              continue;
            } else {
              throw new Error("AI Server took too long to wake up. Please try again.");
            }
          }
          throw new Error(errData.error || `Server error: ${response.status}`);
        }

        finalBlob = await response.blob();
        break; 
      }

      setResultImage(createUrl(finalBlob));
      setStatusText("Done!");

    } catch (err) {
      console.error("Frontend Error:", err);
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
          subtitle="Powered by Custom AI Engine (rembg)"
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
              {isProcessing ? statusText : "Remove Background"}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-muted font-mono text-center px-4">
                  {isProcessing ? (
                    <span className="animate-pulse">{statusText}</span>
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

echo "Done! Update your .env.local with the new variables."
