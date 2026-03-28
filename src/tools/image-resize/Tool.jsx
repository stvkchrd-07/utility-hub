"use client";

import { useState, useRef, useEffect } from "react";

export default function ImageResizeTool() {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState({
    width: "",
    height: "",
    quality: 90,
    format: "image/jpeg",
    maintainAspectRatio: true,
  });
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const aspectRatioRef = useRef(null);

  // OPTIMIZATION: Prevent tab crashes on heavy usage
  useEffect(() => {
    return () => {
      if (image?.url) URL.revokeObjectURL(image.url);
      if (result?.url) URL.revokeObjectURL(result?.url);
    };
  }, [image, result]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    
    if (image?.url) URL.revokeObjectURL(image.url);
    if (result?.url) URL.revokeObjectURL(result.url);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      aspectRatioRef.current = img.width / img.height;
      setImage({ url, file, width: img.width, height: img.height });
      setSettings((s) => ({ ...s, width: img.width, height: img.height }));
      setResult(null);
    };
    img.src = url;
  };

  const handleWidthChange = (val) => {
    const w = parseInt(val) || "";
    if (settings.maintainAspectRatio && aspectRatioRef.current && w) {
      const h = Math.round(w / aspectRatioRef.current);
      setSettings((s) => ({ ...s, width: w, height: h }));
    } else {
      setSettings((s) => ({ ...s, width: w }));
    }
  };

  const handleHeightChange = (val) => {
    const h = parseInt(val) || "";
    if (settings.maintainAspectRatio && aspectRatioRef.current && h) {
      const w = Math.round(h * aspectRatioRef.current);
      setSettings((s) => ({ ...s, height: h, width: w }));
    } else {
      setSettings((s) => ({ ...s, height: h }));
    }
  };

  const processImage = () => {
    if (!image || !settings.width || !settings.height) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = settings.width;
      canvas.height = settings.height;
      const ctx = canvas.getContext("2d");
      
      // OPTIMIZATION: Better scaling interpolation
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, settings.width, settings.height);

      const ext = settings.format === "image/png" ? "png" : settings.format === "image/webp" ? "webp" : "jpg";
      canvas.toBlob(
        (blob) => {
          if (result?.url) URL.revokeObjectURL(result.url);
          const url = URL.createObjectURL(blob);
          const originalKB = Math.round(image.file.size / 1024);
          const newKB = Math.round(blob.size / 1024);
          setResult({ url, ext, originalKB, newKB, blob });
          setIsProcessing(false);
        },
        settings.format,
        settings.quality / 100
      );
    };
    img.src = image.url;
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `resized.${result.ext}`;
    a.click();
  };

  const inputClass = "w-full bg-bg border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-ink transition-colors";

  return (
    <div className="space-y-8">
      {!image && (
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
          <p className="font-display font-bold text-xl text-ink">Drop your image here</p>
          <p className="text-muted text-sm mt-2">PNG, JPG, WEBP — click to browse</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {image && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="chrome-card">
              <div className="chrome-bar">
                <div className="chrome-dot" /><div className="chrome-dot" />
                <span className="text-xs font-mono text-muted ml-2">settings</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-mono text-muted mb-2 uppercase tracking-wider">Dimensions (px)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <input type="number" value={settings.width} onChange={(e) => handleWidthChange(e.target.value)} placeholder="Width" className={inputClass} />
                    <span className="text-muted font-mono text-lg">×</span>
                    <input type="number" value={settings.height} onChange={(e) => handleHeightChange(e.target.value)} placeholder="Height" className={inputClass} />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setSettings((s) => ({ ...s, maintainAspectRatio: !s.maintainAspectRatio }))}
                    className={`w-10 h-5 rounded-full transition-colors ${settings.maintainAspectRatio ? "bg-ink" : "bg-border"} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.maintainAspectRatio ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-ink font-mono">Lock aspect ratio</span>
                </label>

                <div>
                  <label className="block text-xs font-mono text-muted mb-2 uppercase tracking-wider">Quality — {settings.quality}%</label>
                  <input type="range" min="10" max="100" value={settings.quality}
                    onChange={(e) => setSettings((s) => ({ ...s, quality: parseInt(e.target.value) }))}
                    className="w-full accent-accent" />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted mb-2 uppercase tracking-wider">Output Format</label>
                  <div className="flex gap-2">
                    {[ { label: "JPG", value: "image/jpeg" }, { label: "PNG", value: "image/png" }, { label: "WEBP", value: "image/webp" } ].map((f) => (
                      <button key={f.value} onClick={() => setSettings((s) => ({ ...s, format: f.value }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-mono border transition-colors ${settings.format === f.value ? "bg-ink text-bg border-ink" : "bg-bg border-border text-ink hover:border-ink"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 text-xs font-mono text-muted">
              <span>Original: {image.width}×{image.height}px</span><span>·</span>
              <span>{Math.round(image.file.size / 1024)} KB</span>
            </div>

            <button onClick={processImage} disabled={isProcessing}
              className="w-full bg-ink text-bg font-display font-bold py-3.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
              {isProcessing ? "Processing…" : "Resize Image"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="chrome-card">
              <div className="chrome-bar">
                <div className="chrome-dot" /><div className="chrome-dot" />
                <span className="text-xs font-mono text-muted ml-2">preview</span>
              </div>
              <div className="p-4">
                <img src={result?.url || image.url} alt="Preview" className="w-full h-52 sm:h-64 object-contain" />
              </div>
            </div>

            {result && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-mono">
                  <span className="text-muted">New size: <span className="text-ink">{settings.width}×{settings.height}px</span></span>
                  <span className="text-muted">File: <span className={result.newKB < result.originalKB ? "text-green-600" : "text-accent"}>{result.newKB} KB</span> <span className="text-muted">(was {result.originalKB} KB)</span></span>
                </div>
                <button onClick={handleDownload} className="w-full bg-accent text-white font-display font-bold py-3.5 rounded-lg hover:bg-ink transition-colors">
                  ↓ Download {result.ext.toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {image && (
        <button onClick={() => { setImage(null); setResult(null); }} className="text-sm text-muted font-mono hover:text-ink transition-colors">
          ← Use different image
        </button>
      )}
    </div>
  );
}
