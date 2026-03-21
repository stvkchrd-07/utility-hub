"use client";

import { useState, useRef } from "react";

export default function BgRemoverTool() {
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResultImage(null);
    setError(null);
    setProgress(0);
    const url = URL.createObjectURL(file);
    setOriginalImage({ url, file });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setResultImage(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setOriginalImage({ url, file });
  };

  const removeBackground = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      // Dynamically import to avoid SSR issues
      const { removeBackground } = await import("@imgly/background-removal");
      setProgress(30);

      const modelSources = [
        process.env.NEXT_PUBLIC_BG_MODEL_PATH,
        "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/",
        "https://unpkg.com/@imgly/background-removal-data@1.7.0/dist/",
      ].filter(Boolean);

      let blob = null;
      let lastError = null;

      for (const publicPath of modelSources) {
        try {
          blob = await removeBackground(originalImage.file, {
            publicPath,
            progress: (key, current, total) => {
              if (total > 0) {
                const pct = Math.round((current / total) * 60) + 30;
                setProgress(Math.min(pct, 90));
              }
            },
          });
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!blob) {
        throw lastError || new Error("Unable to load model assets");
      }
      const blob = await removeBackground(originalImage.file, {
        // Use CDN-hosted model assets so deployment environments (like Vercel)
        // don't depend on local static path resolution for wasm/model files.
        publicPath:
          "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/",
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 60) + 30;
            setProgress(Math.min(pct, 90));
          }
        },
      });

      setProgress(100);
      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl);
    } catch (err) {
      console.error(err);
      setError(
        "Background removal failed. Set NEXT_PUBLIC_BG_MODEL_PATH in Vercel, or allow jsdelivr/unpkg."
        "Background removal failed. Please retry (network/model download may be blocked)."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "removed-bg.png";
    a.click();
  };

  return (
    <div className="space-y-8">
      {/* Drop zone */}
      {!originalImage && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 sm:p-16 text-center cursor-pointer hover:border-ink transition-colors group"
        >
          <div className="text-5xl mb-4">⬆</div>
          <p className="font-display font-bold text-xl text-ink">
            Drop your image here
          </p>
          <p className="text-muted text-sm mt-2">
            or click to browse — PNG, JPG, WEBP supported
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Image preview area */}
      {originalImage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original */}
          <div className="chrome-card">
            <div className="chrome-bar">
              <div className="chrome-dot" />
              <div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">
                original.jpg
              </span>
            </div>
            <div className="p-4 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ddd%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ddd%22%2F%3E%3C%2Fsvg%3E')]">
              <img
                src={originalImage.url}
                alt="Original"
                className="w-full h-52 sm:h-64 object-contain"
              />
            </div>
          </div>

          {/* Result */}
          <div className="chrome-card">
            <div className="chrome-bar">
              <div className="chrome-dot" />
              <div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">
                removed-bg.png
              </span>
            </div>
            <div className="p-4 h-[calc(100%-41px)] flex items-center justify-center bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]">
              {resultImage ? (
                <img
                  src={resultImage}
                  alt="Result"
                  className="w-full h-52 sm:h-64 object-contain"
                />
              ) : (
                <div className="text-center text-muted">
                  {isProcessing ? (
                    <div className="space-y-3">
                      <div className="text-2xl animate-spin inline-block">
                        ◌
                      </div>
                      <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs font-mono">{progress}% — processing</p>
                    </div>
                  ) : (
                    <p className="text-sm">Result will appear here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-accent text-sm font-mono border border-accent/30 bg-accent/5 rounded-lg px-4 py-3">
          ✕ {error}
        </p>
      )}

      {/* Actions */}
      {originalImage && (
        <div className="flex gap-3 flex-wrap">
          {!resultImage ? (
            <button
              onClick={removeBackground}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-ink text-bg font-display font-bold px-8 py-3 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Removing…" : "Remove Background"}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto bg-accent text-white font-display font-bold px-8 py-3 rounded-lg hover:bg-ink transition-colors"
            >
              ↓ Download PNG
            </button>
          )}
          <button
            onClick={() => {
              setOriginalImage(null);
              setResultImage(null);
              setProgress(0);
            }}
            className="w-full sm:w-auto border border-border text-ink font-display px-6 py-3 rounded-lg hover:border-ink transition-colors"
          >
            Start over
          </button>
        </div>
      )}

      {/* Info note */}
      <p className="text-xs text-muted font-mono">
        ✦ Runs 100% in your browser. Your images never leave your device.
      </p>
    </div>
  );
}
