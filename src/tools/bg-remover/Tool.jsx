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
      // Import from the official @huggingface/transformers v3 package
      const { pipeline, env, RawImage } = await import("@huggingface/transformers");
      
      // OPTIMIZATION: Use WebAssembly only to avoid 'onnxruntime_binding.node' errors
      env.allowLocalModels = false;
      env.backends.onnx.wasm.proxy = false;

      // Use the 'Xenova' version which is quantized (45MB) and compatible with Transformers.js
      const segmenter = await pipeline("image-segmentation", "Xenova/RMBG-1.4", {
        progress_callback: (p) => {
          if (p.status === "progress") setProgress(Math.round(p.progress));
        },
      });

      // Load image into library's RawImage format for cleaner processing
      const img = await RawImage.fromURL(originalImage.url);
      const output = await segmenter(img);
      
      // Apply mask to original image via canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      // Draw original
      const originalCanvasImage = await originalImageToBitmap(originalImage.url, img.width, img.height);
      ctx.drawImage(originalCanvasImage, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      // output.mask contains alpha values [0-255]
      for (let i = 0; i < output.mask.data.length; ++i) {
        data[i * 4 + 3] = output.mask.data[i];
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        setResultImage(URL.createObjectURL(blob));
        setProgress(100);
      });

    } catch (err) {
      console.error("Hugging Face Error:", err);
      setError("Incompatible model or connection issue. Ensure you are using Xenova/RMBG-1.4.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to ensure original image is loaded correctly for canvas drawing
  async function originalImageToBitmap(url, w, h) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  }

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
