"use client";

import { useState } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

// Helper function to extract base64 text from a File
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
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    
    // Vercel JSON payload limits us to ~4.5MB
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
    
    try {
      const base64Data = await fileToBase64(originalImage.file);

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data })
      });

      if (!response.ok) {
        let errorMessage = "Failed to process image.";
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server crashed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      setResultImage(createUrl(blob));

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
          subtitle="Powered by remove.bg API"
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
              {isProcessing ? "Processing instantly... ✨" : "Remove Background"}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-muted font-mono text-center px-4">
                  {isProcessing ? (
                    <span className="animate-pulse">Uploading to remove.bg...</span>
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
