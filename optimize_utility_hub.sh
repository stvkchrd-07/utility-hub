#!/bin/bash

echo "Optimizing Background Remover Tool..."
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useRef, useState, useEffect } from "react";

export default function BgRemoverTool() {
  const fileInputRef = useRef(null);
  const segmenterRef = useRef(null); // OPTIMIZATION: Cache the AI pipeline

  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // OPTIMIZATION: Memory Leak Prevention
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
      // Initialize pipeline only once per session
      if (!segmenterRef.current) {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = true;
        env.localModelPath = "/models/";
        env.backends.onnx.wasm.proxy = false;

        segmenterRef.current = await pipeline("background-removal", "rmbg-1.4", {
          progress_callback: (p) => {
            if (p.status === "progress") setProgress(Math.round(p.progress));
          },
        });
      } else {
        setProgress(50); // Instant visual feedback if cached
      }

      const output = await segmenterRef.current(originalImage.url);
      const blob = await output.toBlob();
      
      if (resultImage) URL.revokeObjectURL(resultImage); // Free old memory
      setResultImage(URL.createObjectURL(blob));
      setProgress(100);

    } catch (err) {
      console.error("BG Remover Error:", err);
      setError(`Processing failed: ${err.message}`);
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
          {/* FIX: Removed invalid UTF-8 byte character */}
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
              onClick={removeBackground}
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

echo "Optimizing Image Resize Tool..."
cat << 'INNER_EOF' > src/tools/image-resize/Tool.jsx
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
INNER_EOF

echo "Optimizing QR Generator Tool..."
cat << 'INNER_EOF' > src/tools/qr-generator/Tool.jsx
"use client";

import { useState, useRef, useEffect } from "react";

const DOT_STYLES = [
  { id: "square", label: "Square" }, { id: "rounded", label: "Rounded" }, { id: "dots", label: "Dots" },
  { id: "classy", label: "Classy" }, { id: "classy-rounded", label: "Classy+" }, { id: "extra-rounded", label: "Extra" },
];

const CORNER_STYLES = [
  { id: "square", label: "Square" }, { id: "extra-rounded", label: "Rounded" }, { id: "dot", label: "Dot" },
];

const PRESETS = [
  { id: "midnight", label: "Midnight", dot: "#0A0A0A", bg: "#F2F0EB", grad: false },
  { id: "fire",     label: "Fire",     dot: "#FF3800", bg: "#0A0A0A", grad: true,  c1: "#FF3800", c2: "#FF8C00" },
  { id: "ocean",    label: "Ocean",    dot: "#0066FF", bg: "#F0F7FF", grad: true,  c1: "#0066FF", c2: "#00C6FF" },
  { id: "forest",   label: "Forest",   dot: "#1A7A2E", bg: "#F0FFF4", grad: true,  c1: "#1A7A2E", c2: "#52C234" },
  { id: "candy",    label: "Candy",    dot: "#D63AF9", bg: "#FFF0FF", grad: true,  c1: "#D63AF9", c2: "#FF6FD8" },
  { id: "gold",     label: "Gold",     dot: "#8B6914", bg: "#FFFBF0", grad: true,  c1: "#F7971E", c2: "#FFD200" },
];

const DEFAULT_SETTINGS = {
  text: "https://utilityhub.app", size: 400, dotStyle: "rounded", cornerStyle: "extra-rounded",
  dotColor: "#0A0A0A", bgColor: "#F2F0EB", gradEnabled: false, gradColor1: "#0A0A0A", gradColor2: "#FF3800",
  gradType: "linear", margin: 10, errorLevel: "H", logoUrl: null, logoSize: 0.3, preset: "midnight",
};

export default function QrGeneratorTool() {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const logoInputRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [downloaded, setDownloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // OPTIMIZATION: Clean up Logo Object URLs
  useEffect(() => {
    return () => {
      if (settings.logoUrl) URL.revokeObjectURL(settings.logoUrl);
    };
  }, [settings.logoUrl]);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const buildQR = async () => {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      const dotOptionsColor = settings.gradEnabled
        ? {
            type: "gradient",
            gradient: {
              type: settings.gradType, rotation: 45,
              colorStops: [ { offset: 0, color: settings.gradColor1 }, { offset: 1, color: settings.gradColor2 } ],
            },
          }
        : { type: "color", color: settings.dotColor };

      const qr = new QRCodeStyling({
        width: settings.size, height: settings.size, type: "canvas",
        data: settings.text || "https://utilityhub.app",
        margin: settings.margin, qrOptions: { errorCorrectionLevel: settings.errorLevel },
        dotsOptions: { ...dotOptionsColor, type: settings.dotStyle },
        cornersSquareOptions: { type: settings.cornerStyle, color: settings.gradEnabled ? settings.gradColor1 : settings.dotColor },
        cornersDotOptions: { type: settings.cornerStyle === "dot" ? "dot" : "square", color: settings.gradEnabled ? settings.gradColor1 : settings.dotColor },
        backgroundOptions: { color: settings.bgColor },
        ...(settings.logoUrl && { image: settings.logoUrl, imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: settings.logoSize } }),
      });

      qrRef.current = qr;
      containerRef.current.innerHTML = "";
      qr.append(containerRef.current);
    };

    buildQR();
  }, [mounted, settings]);

  const handleDownload = () => {
    if (!qrRef.current) return;
    qrRef.current.download({ name: "fancy-qr", extension: "png" });
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (settings.logoUrl) URL.revokeObjectURL(settings.logoUrl);
    set("logoUrl", URL.createObjectURL(file));
  };

  const applyPreset = (p) => {
    setSettings((s) => ({ ...s, dotColor: p.dot, bgColor: p.bg, gradEnabled: p.grad || false, gradColor1: p.c1 || p.dot, gradColor2: p.c2 || p.dot, preset: p.id }));
  };

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-ink transition-colors";
  const labelClass = "block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5";

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 sm:gap-8">
      <div className="space-y-4">
        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">preview.png</span></div>
          <div className="p-4 sm:p-8 flex items-center justify-center min-h-[280px] sm:min-h-[420px]" style={{ background: settings.bgColor }}>
            <div ref={containerRef} className="rounded-lg overflow-hidden shadow-lg scale-[0.72] sm:scale-100 origin-center" />
          </div>
        </div>
        <button onClick={handleDownload} className="w-full bg-ink text-bg font-display font-bold py-4 rounded-xl hover:bg-accent transition-colors text-lg">
          {downloaded ? "✓ Downloaded!" : "↓ Download PNG"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">content</span></div>
          <div className="p-5">
            <label className={labelClass}>URL or Text</label>
            <textarea value={settings.text} onChange={(e) => set("text", e.target.value)} rows={3} placeholder="https://your-link.com" className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">color presets</span></div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className="py-2 px-3 rounded-lg text-xs font-mono border transition-all"
                  style={{ background: settings.preset === p.id ? p.dot : p.bg, color: settings.preset === p.id ? p.bg : p.dot, borderColor: p.dot, outline: settings.preset === p.id ? `2px solid ${p.dot}` : "none" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">dot & corner style</span></div>
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Dot Shape</label>
              <div className="grid grid-cols-3 gap-2">
                {DOT_STYLES.map((d) => (
                  <button key={d.id} onClick={() => set("dotStyle", d.id)}
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${settings.dotStyle === d.id ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Corner Style</label>
              <div className="grid grid-cols-3 gap-2">
                {CORNER_STYLES.map((c) => (
                  <button key={c.id} onClick={() => set("cornerStyle", c.id)}
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${settings.cornerStyle === c.id ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">colors</span></div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex-1">
                <label className={labelClass}>Background</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.bgColor} onChange={(e) => set("bgColor", e.target.value)} className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input type="text" value={settings.bgColor} onChange={(e) => set("bgColor", e.target.value)} className={`${inputClass} flex-1`} />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Dot Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.dotColor} onChange={(e) => set("dotColor", e.target.value)} className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input type="text" value={settings.dotColor} onChange={(e) => set("dotColor", e.target.value)} className={`${inputClass} flex-1`} />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set("gradEnabled", !settings.gradEnabled)} className={`w-10 h-5 rounded-full transition-colors ${settings.gradEnabled ? "bg-ink" : "bg-border"} relative`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.gradEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-mono text-ink">Gradient dots</span>
            </label>

            {settings.gradEnabled && (
              <div className="space-y-3 pl-2 border-l-2 border-border">
                <div className="flex gap-3">
                  <div className="flex-1"><label className={labelClass}>Color 1</label><input type="color" value={settings.gradColor1} onChange={(e) => set("gradColor1", e.target.value)} className="w-full h-9 rounded border border-border cursor-pointer" /></div>
                  <div className="flex-1"><label className={labelClass}>Color 2</label><input type="color" value={settings.gradColor2} onChange={(e) => set("gradColor2", e.target.value)} className="w-full h-9 rounded border border-border cursor-pointer" /></div>
                </div>
                <div className="flex gap-2">
                  {["linear", "radial"].map((t) => (
                    <button key={t} onClick={() => set("gradType", t)} className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${settings.gradType === t ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"}`}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="chrome-card">
          <div className="chrome-bar"><div className="chrome-dot" /><div className="chrome-dot" /><span className="text-xs font-mono text-muted ml-2">logo (optional)</span></div>
          <div className="p-5 space-y-3">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <button onClick={() => logoInputRef.current?.click()} className="w-full border border-dashed border-border rounded-lg py-3 text-sm font-mono text-muted hover:border-ink hover:text-ink transition-colors">
              {settings.logoUrl ? "✓ Logo uploaded — click to change" : "+ Upload logo / icon"}
            </button>
            {settings.logoUrl && (
              <div className="space-y-2">
                <label className={labelClass}>Logo size — {Math.round(settings.logoSize * 100)}%</label>
                <input type="range" min="10" max="40" value={Math.round(settings.logoSize * 100)} onChange={(e) => set("logoSize", parseInt(e.target.value) / 100)} className="w-full accent-accent" />
                <button onClick={() => { URL.revokeObjectURL(settings.logoUrl); set("logoUrl", null); }} className="text-xs font-mono text-accent hover:underline">Remove logo</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
INNER_EOF

# Clear cache and run
echo "Cleaning Next.js cache..."
rm -rf .next
echo "Done! Restart your server with: npm run dev"
