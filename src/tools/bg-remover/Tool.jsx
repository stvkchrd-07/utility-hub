"use client";

import { useState } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

export default function BgRemoverTool() {
  const { createUrl } = useBlobManager();
  
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState("");

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setOriginalImage({ file, url: createUrl(file) });
    setResultImage(null);
    setError(null);
    setProgress(0);
    setStatusText("");
  };

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(5);
    setStatusText("Initializing Hugging Face AI...");
    
    try {
      // Lazy load the Hugging Face pipeline
      const { pipeline, env } = await import("@huggingface/transformers");
      
      // Ensure we pull the model directly from the Hugging Face Hub
      env.allowLocalModels = false;
      
      setStatusText("Loading RMBG-1.4 Model...");
      
      // Initialize the official background-removal pipeline
      const segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        progress_callback: (p) => {
          if (p.status === 'progress' && p.progress) {
            setProgress(Math.round(5 + (p.progress * 0.75))); // Scale download progress
          }
        }
      });
      
      setProgress(85);
      setStatusText("Extracting foreground...");
      
      // Run the image through the Hugging Face model
      const output = await segmenter(originalImage.url);
      
      setProgress(95);
      setStatusText("Finalizing image...");
      
      // The background-removal pipeline returns a RawImage object. We convert it to a transparent PNG.
      const result = Array.isArray(output) ? output[0] : output;
      const blob = await result.toBlob('image/png');
      
      setResultImage(createUrl(blob));
      setProgress(100);
      setStatusText("Done!");
    } catch (err) {
      console.error(err);
      setError(`Failed to process image: ${err.message}`);
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
          subtitle="Powered by Hugging Face (RMBG-1.4)"
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
              {isProcessing ? `${statusText} ${progress}%` : "Remove Background"}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted font-mono text-center px-4">
                  {isProcessing ? "AI is working its magic... ✨" : "Result Preview"}
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
            {error && <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
