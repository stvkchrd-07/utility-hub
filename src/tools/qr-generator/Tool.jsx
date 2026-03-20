"use client";

import { useState, useRef, useEffect } from "react";

const DOT_STYLES = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy+" },
  { id: "extra-rounded", label: "Extra" },
];

const CORNER_STYLES = [
  { id: "square", label: "Square" },
  { id: "extra-rounded", label: "Rounded" },
  { id: "dot", label: "Dot" },
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
  text: "https://utilityhub.app",
  size: 400,
  dotStyle: "rounded",
  cornerStyle: "extra-rounded",
  dotColor: "#0A0A0A",
  bgColor: "#F2F0EB",
  gradEnabled: false,
  gradColor1: "#0A0A0A",
  gradColor2: "#FF3800",
  gradType: "linear",
  margin: 10,
  errorLevel: "H",
  logoUrl: null,
  logoSize: 0.3,
  preset: "midnight",
};

export default function QrGeneratorTool() {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const logoInputRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [downloaded, setDownloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Build QR whenever settings change
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const buildQR = async () => {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      const dotOptionsColor = settings.gradEnabled
        ? {
            type: "gradient",
            gradient: {
              type: settings.gradType,
              rotation: 45,
              colorStops: [
                { offset: 0, color: settings.gradColor1 },
                { offset: 1, color: settings.gradColor2 },
              ],
            },
          }
        : { type: "color", color: settings.dotColor };

      const qr = new QRCodeStyling({
        width: settings.size,
        height: settings.size,
        type: "canvas",
        data: settings.text || "https://utilityhub.app",
        margin: settings.margin,
        qrOptions: { errorCorrectionLevel: settings.errorLevel },
        dotsOptions: {
          ...dotOptionsColor,
          type: settings.dotStyle,
        },
        cornersSquareOptions: {
          type: settings.cornerStyle,
          color: settings.gradEnabled ? settings.gradColor1 : settings.dotColor,
        },
        cornersDotOptions: {
          type: settings.cornerStyle === "dot" ? "dot" : "square",
          color: settings.gradEnabled ? settings.gradColor1 : settings.dotColor,
        },
        backgroundOptions: { color: settings.bgColor },
        ...(settings.logoUrl && {
          image: settings.logoUrl,
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 4,
            imageSize: settings.logoSize,
          },
        }),
      });

      qrRef.current = qr;

      // Clear and re-append
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
    set("logoUrl", URL.createObjectURL(file));
  };

  const applyPreset = (p) => {
    setSettings((s) => ({
      ...s,
      dotColor: p.dot,
      bgColor: p.bg,
      gradEnabled: p.grad || false,
      gradColor1: p.c1 || p.dot,
      gradColor2: p.c2 || p.dot,
      preset: p.id,
    }));
  };

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-ink transition-colors";
  const labelClass = "block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5";

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 sm:gap-8">

      {/* ── Left: Preview ── */}
      <div className="space-y-4">
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">preview.png</span>
          </div>
          <div
            className="p-4 sm:p-8 flex items-center justify-center min-h-[280px] sm:min-h-[420px]"
            style={{ background: settings.bgColor }}
          >
            <div
              ref={containerRef}
              className="rounded-lg overflow-hidden shadow-lg scale-[0.72] sm:scale-100 origin-center"
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
      <div className="space-y-4">

        {/* Content */}
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

        {/* Presets */}
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
                  className="py-2 px-3 rounded-lg text-xs font-mono border transition-all"
                  style={{
                    background: settings.preset === p.id ? p.dot : p.bg,
                    color: settings.preset === p.id ? p.bg : p.dot,
                    borderColor: p.dot,
                    outline: settings.preset === p.id ? `2px solid ${p.dot}` : "none",
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
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Dot Shape</label>
              <div className="grid grid-cols-3 gap-2">
                {DOT_STYLES.map((d) => (
                  <button key={d.id} onClick={() => set("dotStyle", d.id)}
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                      settings.dotStyle === d.id ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"
                    }`}>
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
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                      settings.cornerStyle === c.id ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex-1">
                <label className={labelClass}>Background</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.bgColor}
                    onChange={(e) => set("bgColor", e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input type="text" value={settings.bgColor}
                    onChange={(e) => set("bgColor", e.target.value)}
                    className={`${inputClass} flex-1`} />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Dot Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.dotColor}
                    onChange={(e) => set("dotColor", e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input type="text" value={settings.dotColor}
                    onChange={(e) => set("dotColor", e.target.value)}
                    className={`${inputClass} flex-1`} />
                </div>
              </div>
            </div>

            {/* Gradient toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set("gradEnabled", !settings.gradEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${settings.gradEnabled ? "bg-ink" : "bg-border"} relative`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.gradEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-mono text-ink">Gradient dots</span>
            </label>

            {settings.gradEnabled && (
              <div className="space-y-3 pl-2 border-l-2 border-border">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Color 1</label>
                    <input type="color" value={settings.gradColor1}
                      onChange={(e) => set("gradColor1", e.target.value)}
                      className="w-full h-9 rounded border border-border cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Color 2</label>
                    <input type="color" value={settings.gradColor2}
                      onChange={(e) => set("gradColor2", e.target.value)}
                      className="w-full h-9 rounded border border-border cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {["linear", "radial"].map((t) => (
                    <button key={t} onClick={() => set("gradType", t)}
                      className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${
                        settings.gradType === t ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"
                      }`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
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
            <button onClick={() => logoInputRef.current?.click()}
              className="w-full border border-dashed border-border rounded-lg py-3 text-sm font-mono text-muted hover:border-ink hover:text-ink transition-colors">
              {settings.logoUrl ? "✓ Logo uploaded — click to change" : "+ Upload logo / icon"}
            </button>
            {settings.logoUrl && (
              <div className="space-y-2">
                <label className={labelClass}>Logo size — {Math.round(settings.logoSize * 100)}%</label>
                <input type="range" min="10" max="40" value={Math.round(settings.logoSize * 100)}
                  onChange={(e) => set("logoSize", parseInt(e.target.value) / 100)}
                  className="w-full accent-accent" />
                <button onClick={() => set("logoUrl", null)}
                  className="text-xs font-mono text-accent hover:underline">
                  Remove logo
                </button>
              </div>
            )}
            <p className="text-[11px] font-mono text-muted">
              Use error level H when adding a logo
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
                {["L", "M", "Q", "H"].map((l) => (
                  <button key={l} onClick={() => set("errorLevel", l)}
                    className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                      settings.errorLevel === l ? "bg-ink text-bg border-ink" : "border-border hover:border-ink text-ink"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-mono text-muted mt-1.5">H = highest · use with logo</p>
            </div>
            <div>
              <label className={labelClass}>Size — {settings.size}px</label>
              <input type="range" min="200" max="800" step="100" value={settings.size}
                onChange={(e) => set("size", parseInt(e.target.value))}
                className="w-full accent-accent" />
            </div>
            <div>
              <label className={labelClass}>Margin — {settings.margin}px</label>
              <input type="range" min="0" max="40" step="5" value={settings.margin}
                onChange={(e) => set("margin", parseInt(e.target.value))}
                className="w-full accent-accent" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
