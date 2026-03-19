"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── QR encoding via qrcode library loaded from CDN ──
// We dynamically load qrcode.js from CDN to avoid bundling issues

const DOT_STYLES = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "diamond", label: "Diamond" },
];

const PRESETS = [
  { id: "midnight", label: "Midnight", fg: "#0A0A0A", bg: "#F2F0EB", grad1: "#0A0A0A", grad2: "#0A0A0A", gradEnabled: false },
  { id: "fire", label: "Fire", fg: "#FF3800", bg: "#0A0A0A", grad1: "#FF3800", grad2: "#FF8C00", gradEnabled: true },
  { id: "ocean", label: "Ocean", fg: "#0066FF", bg: "#F0F7FF", grad1: "#0066FF", grad2: "#00C6FF", gradEnabled: true },
  { id: "forest", label: "Forest", fg: "#1A7A2E", bg: "#F0FFF4", grad1: "#1A7A2E", grad2: "#52C234", gradEnabled: true },
  { id: "candy", label: "Candy", fg: "#D63AF9", bg: "#FFF0FF", grad1: "#D63AF9", grad2: "#FF6FD8", gradEnabled: true },
  { id: "gold", label: "Gold", fg: "#8B6914", bg: "#FFFBF0", grad1: "#F7971E", grad2: "#FFD200", gradEnabled: true },
];

const ERROR_LEVELS = ["L", "M", "Q", "H"];

export default function QrGeneratorTool() {
  // Client-only guard
  if (typeof window === "undefined") {
    return null;
  }

  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);
  const [qrLib, setQrLib] = useState(null);
  const [libError, setLibError] = useState(false);

  const [settings, setSettings] = useState({
    text: "https://utilityhub.app",
    size: 512,
    dotStyle: "rounded",
    fgColor: "#0A0A0A",
    bgColor: "#F2F0EB",
    gradEnabled: false,
    grad1: "#0A0A0A",
    grad2: "#FF3800",
    gradAngle: 135,
    errorLevel: "H",
    margin: 2,
    logoUrl: null,
    logoSize: 22, // % of QR size
    preset: "midnight",
  });

  const [isRendering, setIsRendering] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client before rendering
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
  if (typeof window === "undefined") return;
  if (window.QRCode) { setQrLib(window.QRCode); return; }
  
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  script.async = true;
  script.onload = () => {
    if (window.QRCode) setQrLib(window.QRCode);
    else setLibError(true);
  };
  script.onerror = () => setLibError(true);
  
  const addScript = () => {
    if (document.body) {
      document.body.appendChild(script);
    }
  };
  
  if (document.body) {
    addScript();
  } else {
    document.addEventListener("DOMContentLoaded", addScript);
  }

  return () => {
    // cleanup
    const existing = document.querySelector(`script[src="${script.src}"]`);
    if (existing) existing.remove();
    document.removeEventListener("DOMContentLoaded", addScript);
  };
}, []);
  // Use qrcode-generator approach via our own QR matrix builder
  // Since qrcodejs doesn't expose matrix, we use a canvas-based approach
  const generateQRMatrix = useCallback(async (text, errorLevel) => {
    return new Promise((resolve) => {
      try {
        if (!document.body) {
          resolve(null);
          return;
        }
        // Create offscreen div, render QR, extract pixel data
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        document.body.appendChild(container);

        const qr = new window.QRCode(container, {
          text,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel[errorLevel],
        });

        setTimeout(() => {
          const img = container.querySelector("img") || container.querySelector("canvas");
          if (!img) { document.body.removeChild(container); resolve(null); return; }

          // Draw to offscreen canvas and read pixel matrix
          const offCanvas = document.createElement("canvas");
          offCanvas.width = 256;
          offCanvas.height = 256;
          const ctx = offCanvas.getContext("2d");

          const drawImg = new Image();
          drawImg.onload = () => {
            ctx.drawImage(drawImg, 0, 0, 256, 256);
            const imageData = ctx.getImageData(0, 0, 256, 256);
            document.body.removeChild(container);
            resolve({ imageData, canvas: offCanvas });
          };
          drawImg.onerror = () => { document.body.removeChild(container); resolve(null); };

          if (img.tagName === "IMG") drawImg.src = img.src;
          else drawImg.src = img.toDataURL();
        }, 100);
      } catch (e) {
        resolve(null);
      }
    });
  }, []);

  const renderQR = useCallback(async () => {
    if (!canvasRef.current || !qrLib) return;
    setIsRendering(true);

    const { text, size, dotStyle, fgColor, bgColor, gradEnabled, grad1, grad2,
            gradAngle, errorLevel, margin, logoUrl, logoSize } = settings;

    if (!text.trim()) { setIsRendering(false); return; }

    // Get QR matrix from qrcodejs
    const qrData = await generateQRMatrix(text, errorLevel);
    if (!qrData) { setIsRendering(false); return; }

    const canvas = canvasRef.current;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Read QR matrix by sampling the 256x256 source
    const srcCtx = qrData.canvas.getContext("2d");
    const srcData = srcCtx.getImageData(0, 0, 256, 256);

    // Detect QR module size by finding the quiet zone
    // Sample column from top to find first dark pixel
    let firstDark = -1;
    for (let y = 0; y < 256; y++) {
      const i = (y * 256 + 128) * 4;
      if (srcData.data[i] < 128) { firstDark = y; break; }
    }
    const quietZonePixels = firstDark > 0 ? firstDark : 4;

    // Determine module count by sampling
    // QR codes are typically 21x21 to 177x177 modules
    // We sample to find module pixel size
    let modulePixels = 1;
    if (firstDark > 0) {
      for (let y = firstDark; y < 256; y++) {
        const i = (y * 256 + 128) * 4;
        if (srcData.data[i] >= 128) { modulePixels = y - firstDark; break; }
      }
    }
    if (modulePixels < 1) modulePixels = 1;

    const moduleCount = Math.round((256 - quietZonePixels * 2) / modulePixels);

    // Build boolean matrix
    const matrix = [];
    for (let row = 0; row < moduleCount; row++) {
      matrix[row] = [];
      for (let col = 0; col < moduleCount; col++) {
        const srcX = Math.round(quietZonePixels + col * modulePixels + modulePixels / 2);
        const srcY = Math.round(quietZonePixels + row * modulePixels + modulePixels / 2);
        const clampX = Math.min(srcX, 255);
        const clampY = Math.min(srcY, 255);
        const i = (clampY * 256 + clampX) * 4;
        matrix[row][col] = srcData.data[i] < 128;
      }
    }

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Set up gradient or solid fill for dots
    const marginPx = margin * (size / (moduleCount + margin * 2));
    const cellSize = (size - marginPx * 2) / moduleCount;

    let dotFill;
    if (gradEnabled) {
      const angleRad = (gradAngle * Math.PI) / 180;
      const cx = size / 2, cy = size / 2;
      const r = size / 2;
      const x1 = cx - Math.cos(angleRad) * r;
      const y1 = cy - Math.sin(angleRad) * r;
      const x2 = cx + Math.cos(angleRad) * r;
      const y2 = cy + Math.sin(angleRad) * r;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, grad1);
      grad.addColorStop(1, grad2);
      dotFill = grad;
    } else {
      dotFill = fgColor;
    }

    // Helper: is this a finder pattern cell?
    const isFinderPattern = (r, c) => {
      const last = moduleCount - 7;
      return (
        (r < 7 && c < 7) ||
        (r < 7 && c >= last) ||
        (r >= last && c < 7)
      );
    };

    // Draw dots
    ctx.fillStyle = dotFill;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!matrix[row][col]) continue;

        const x = marginPx + col * cellSize;
        const y = marginPx + row * cellSize;
        const s = cellSize * 0.85;
        const pad = (cellSize - s) / 2;

        // Finder patterns always drawn as rounded squares
        if (isFinderPattern(row, col)) {
          const r = s * 0.25;
          ctx.beginPath();
          ctx.roundRect(x + pad, y + pad, s, s, r);
          ctx.fill();
          continue;
        }

        switch (dotStyle) {
          case "square":
            ctx.fillRect(x + pad, y + pad, s, s);
            break;
          case "rounded": {
            const r = s * 0.3;
            ctx.beginPath();
            ctx.roundRect(x + pad, y + pad, s, s, r);
            ctx.fill();
            break;
          }
          case "dots":
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, s / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "diamond": {
            const cx2 = x + cellSize / 2;
            const cy2 = y + cellSize / 2;
            const h = s / 2;
            ctx.beginPath();
            ctx.moveTo(cx2, cy2 - h);
            ctx.lineTo(cx2 + h, cy2);
            ctx.lineTo(cx2, cy2 + h);
            ctx.lineTo(cx2 - h, cy2);
            ctx.closePath();
            ctx.fill();
            break;
          }
        }
      }
    }

    // Draw logo if present
    if (logoUrl) {
      await new Promise((res) => {
        const logo = new Image();
        logo.onload = () => {
          const logoSizePx = (size * logoSize) / 100;
          const lx = (size - logoSizePx) / 2;
          const ly = (size - logoSizePx) / 2;

          // White background circle behind logo
          ctx.fillStyle = bgColor;
          const pad = logoSizePx * 0.15;
          ctx.beginPath();
          ctx.roundRect(lx - pad, ly - pad, logoSizePx + pad * 2, logoSizePx + pad * 2, 12);
          ctx.fill();

          // Draw logo
          ctx.drawImage(logo, lx, ly, logoSizePx, logoSizePx);
          res();
        };
        logo.onerror = res;
        logo.src = logoUrl;
      });
    }

    setIsRendering(false);
  }, [settings, qrLib, generateQRMatrix]);

  // Re-render on settings change
  useEffect(() => {
    if (qrLib) renderQR();
  }, [settings, qrLib, renderQR]);

  const applyPreset = (preset) => {
    setSettings((s) => ({
      ...s,
      fgColor: preset.fg,
      bgColor: preset.bg,
      grad1: preset.grad1,
      grad2: preset.grad2,
      gradEnabled: preset.gradEnabled,
      preset: preset.id,
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings((s) => ({ ...s, logoUrl: url }));
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = "fancy-qr.png";
    a.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-ink transition-colors";
  const labelClass = "block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5";

  if (libError) {
    return (
      <div className="text-center py-20">
        <p className="text-accent font-mono text-sm">
          ✕ Could not load QR library. Check your internet connection and refresh.
        </p>
      </div>
    );
  }

  if (!mounted || !qrLib) {
    return (
      <div className="text-center py-20 text-muted font-mono text-sm animate-pulse">
        Loading QR engine…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

      {/* ── Left: Preview ── */}
      <div className="space-y-4">
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">preview.png</span>
            {isRendering && (
              <span className="ml-auto text-xs font-mono text-accent animate-pulse">rendering…</span>
            )}
          </div>
          <div className="p-8 flex items-center justify-center min-h-[400px]"
               style={{ background: settings.bgColor }}>
            <canvas
              ref={canvasRef}
              className="max-w-full"
              style={{ maxHeight: 400, imageRendering: "pixelated" }}
            />
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="w-full bg-ink text-bg font-display font-bold py-4 rounded-xl hover:bg-accent transition-colors text-lg"
        >
          {downloaded ? "✓ Downloaded!" : "↓ Download PNG"}
        </button>

        <p className="text-xs text-muted font-mono text-center">
          ✦ Always test scan your QR code before sharing it
        </p>
      </div>

      {/* ── Right: Controls ── */}
      <div className="space-y-5">

        {/* Text input */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">content</span>
          </div>
          <div className="p-5">
            <label className={labelClass}>URL or Text</label>
            <textarea
              value={settings.text}
              onChange={(e) => set("text", e.target.value)}
              rows={3}
              placeholder="https://your-link.com"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Style presets */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">color presets</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono border transition-all ${
                    settings.preset === p.id
                      ? "border-ink bg-ink text-bg"
                      : "border-border hover:border-ink"
                  }`}
                  style={{
                    background: settings.preset === p.id ? p.fg : p.bg,
                    color: settings.preset === p.id ? p.bg : p.fg,
                    borderColor: settings.preset === p.id ? p.fg : undefined,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dot style */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">dot style</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-2">
              {DOT_STYLES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => set("dotStyle", d.id)}
                  className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                    settings.dotStyle === d.id
                      ? "bg-ink text-bg border-ink"
                      : "border-border hover:border-ink text-ink"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">colors</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={labelClass}>Background</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.bgColor}
                    onChange={(e) => set("bgColor", e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent" />
                  <input type="text" value={settings.bgColor}
                    onChange={(e) => set("bgColor", e.target.value)}
                    className={`${inputClass} flex-1`} />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Foreground</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.fgColor}
                    onChange={(e) => set("fgColor", e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent" />
                  <input type="text" value={settings.fgColor}
                    onChange={(e) => set("fgColor", e.target.value)}
                    className={`${inputClass} flex-1`} />
                </div>
              </div>
            </div>

            {/* Gradient toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("gradEnabled", !settings.gradEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${settings.gradEnabled ? "bg-ink" : "bg-border"} relative`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.gradEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-mono text-ink">Gradient dots</span>
            </label>

            {settings.gradEnabled && (
              <div className="space-y-3 pl-2 border-l-2 border-border">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Color 1</label>
                    <input type="color" value={settings.grad1}
                      onChange={(e) => set("grad1", e.target.value)}
                      className="w-full h-9 rounded border border-border cursor-pointer bg-transparent" />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Color 2</label>
                    <input type="color" value={settings.grad2}
                      onChange={(e) => set("grad2", e.target.value)}
                      className="w-full h-9 rounded border border-border cursor-pointer bg-transparent" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Angle — {settings.gradAngle}°</label>
                  <input type="range" min="0" max="360" value={settings.gradAngle}
                    onChange={(e) => set("gradAngle", parseInt(e.target.value))}
                    className="w-full accent-accent" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">logo (optional)</span>
          </div>
          <div className="p-5 space-y-3">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
              onChange={handleLogoUpload} />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full border border-dashed border-border rounded-lg py-3 text-sm font-mono text-muted hover:border-ink hover:text-ink transition-colors"
            >
              {settings.logoUrl ? "✓ Logo uploaded — click to change" : "+ Upload logo / icon"}
            </button>
            {settings.logoUrl && (
              <div className="space-y-2">
                <label className={labelClass}>Logo size — {settings.logoSize}%</label>
                <input type="range" min="10" max="30" value={settings.logoSize}
                  onChange={(e) => set("logoSize", parseInt(e.target.value))}
                  className="w-full accent-accent" />
                <button onClick={() => set("logoUrl", null)}
                  className="text-xs font-mono text-accent hover:underline">
                  Remove logo
                </button>
              </div>
            )}
            <p className="text-[11px] font-mono text-muted">
              Use error level H when adding a logo for better scannability
            </p>
          </div>
        </div>

        {/* Advanced */}
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">advanced</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Error Correction</label>
              <div className="grid grid-cols-4 gap-2">
                {ERROR_LEVELS.map((l) => (
                  <button key={l} onClick={() => set("errorLevel", l)}
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                      settings.errorLevel === l ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-mono text-muted mt-1.5">
                H = highest (use with logo) · L = smallest file
              </p>
            </div>

            <div>
              <label className={labelClass}>Size — {settings.size}px</label>
              <input type="range" min="256" max="1024" step="128" value={settings.size}
                onChange={(e) => set("size", parseInt(e.target.value))}
                className="w-full accent-accent" />
            </div>

            <div>
              <label className={labelClass}>Margin — {settings.margin}</label>
              <input type="range" min="0" max="6" value={settings.margin}
                onChange={(e) => set("margin", parseInt(e.target.value))}
                className="w-full accent-accent" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
