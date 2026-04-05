"use client";

import { useState, useRef, useEffect } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

export default function BgRemoverTool() {
  const { createUrl } = useBlobManager();
  const workerRef = useRef(null);
  
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    // Initialize the Web Worker on the client side
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { status, progress, text, blob, error } = event.data;
      
      if (status === 'init' || status === 'processing') {
        setStatusText(text);
        if (status === 'init') setProgress(5);
        if (status === 'processing') setProgress(85);
      } else if (status === 'progress') {
        setProgress(Math.round(5 + (progress * 0.75)));
      } else if (status === 'done') {
        setResultImage(createUrl(blob));
        setProgress(100);
        setStatusText("Done!");
        setIsProcessing(false);
      } else if (status === 'error') {
        setError(`Failed to process image: ${error}`);
        setIsProcessing(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, [createUrl]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setOriginalImage({ file, url: createUrl(file) });
    setResultImage(null);
    setError(null);
    setProgress(0);
    setStatusText("");
  };

  const handleRemoveBackground = () => {
    if (!originalImage?.url) return;
    setIsProcessing(true);
    setError(null);
    workerRef.current.postMessage({ imageUrl: originalImage.url });
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
          subtitle="Powered by Hugging Face (briaai/RMBG-1.4)"
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
