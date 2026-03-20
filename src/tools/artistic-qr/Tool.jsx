"use client";

import { useState, useRef } from "react";

// ── Paste your Ngrok URL here each time you start Colab ──
const COLAB_URL = "https://essayistic-lynne-unfickle.ngrok-free.dev";

const STYLE_PRESETS = [
  { label: "Cyberpunk City",   prompt: "cyberpunk city neon lights rain reflections, highly detailed, 8k" },
  { label: "Enchanted Forest", prompt: "enchanted magical forest glowing mushrooms fairy lights, fantasy art, detailed" },
  { label: "Japanese Art",     prompt: "japanese ukiyo-e woodblock print cherry blossoms mount fuji, traditional art" },
  { label: "Abstract Waves",   prompt: "abstract fluid art colorful waves geometric patterns, vibrant colors" },
  { label: "Steampunk",        prompt: "steampunk mechanical gears clockwork bronze copper, intricate detailed" },
  { label: "Van Gogh",         prompt: "van gogh starry night style swirling painterly brushstrokes vivid colors" },
];

export default function ArtisticQrTool() {
  const [step, setStep] = useState(1); // 1=input, 2=generating, 3=result
  const [url, setUrl] = useState("https://utilityhub.app");
  const [prompt, setPrompt] = useState("");
  const [controlnetScale, setControlnetScale] = useState(1.6);
  const [numSteps, setNumSteps] = useState(30);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);
  const canvasRef = useRef(null);

  // Generate plain QR first using qr-code-styling, then send to Colab
 const generateBaseQR = async () => {
  const QRCodeStyling = (await import("qr-code-styling")).default;
  const qr = new QRCodeStyling({
    width: 768,        // match the Colab resize
    height: 768,
    type: "canvas",
    data: url,
    dotsOptions: { type: "square", color: "#000000" },  // MUST be square
    backgroundOptions: { color: "#ffffff" },
    qrOptions: { errorCorrectionLevel: "H" },  // H is mandatory
    margin: 30,        // needs quiet zone
  });

    // Render to offscreen canvas and get base64
    const container = document.createElement("div");
    document.body.appendChild(container);
    qr.append(container);

    await new Promise(r => setTimeout(r, 300));

    const canvas = container.querySelector("canvas");
    const b64 = canvas.toDataURL("image/png").split(",")[1];
    document.body.removeChild(container);
    return b64;
  };

  const handleGenerate = async () => {
    if (!url.trim() || !prompt.trim()) return;
    setError(null);
    setStep(2);

    try {
      // Step 1: generate base QR
      const b64 = await generateBaseQR();
      setQrBase64(b64);

      // Step 2: send to Colab
      const res = await fetch(`${COLAB_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          qr_image_base64: b64,
          negative_prompt: "ugly, blurry, low quality, distorted, watermark",
          num_steps: numSteps,
          controlnet_scale: controlnetScale,
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Generation failed");

      setResultImage(`data:image/png;base64,${data.image}`);
      setStep(3);
    } catch (err) {
      setError(err.message);
      setStep(1);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "artistic-qr.png";
    a.click();
  };

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:border-ink transition-colors";
  const labelClass = "block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Colab URL notice */}
      <div className="border border-accent/30 bg-accent/5 rounded-lg px-4 py-3 text-xs font-mono text-accent">
        ⚡ Requires the Colab backend to be running. Start the notebook and paste your Ngrok URL in the code.
      </div>

      {/* Step 1 — Input */}
      {step !== 2 && (
        <div className="space-y-5">

          <div className="chrome-card">
            <div className="chrome-bar">
              <div className="chrome-dot" /><div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">content</span>
            </div>
            <div className="p-5">
              <label className={labelClass}>Your URL or Text</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-link.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="chrome-card">
            <div className="chrome-bar">
              <div className="chrome-dot" /><div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">art style prompt</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Presets */}
              <div>
                <label className={labelClass}>Quick Presets</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STYLE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPrompt(p.prompt)}
                      className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-left ${
                        prompt === p.prompt
                          ? "bg-ink text-bg border-ink"
                          : "border-border hover:border-ink text-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom prompt */}
              <div>
                <label className={labelClass}>Custom Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe the art style you want..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="chrome-card">
            <div className="chrome-bar">
              <div className="chrome-dot" /><div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">generation settings</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>
                  QR Strength — {controlnetScale.toFixed(1)}
                  <span className="ml-2 normal-case text-muted">(higher = more scannable, less artistic)</span>
                </label>
                <input type="range" min="1" max="2" step="0.1"
                  value={controlnetScale}
                  onChange={(e) => setControlnetScale(parseFloat(e.target.value))}
                  className="w-full accent-accent" />
                <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                  <span>More artistic</span>
                  <span>More scannable</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Steps — {numSteps}
                  <span className="ml-2 normal-case text-muted">(more = better quality, slower)</span>
                </label>
                <input type="range" min="10" max="30" step="5"
                  value={numSteps}
                  onChange={(e) => setNumSteps(parseInt(e.target.value))}
                  className="w-full accent-accent" />
              </div>
            </div>
          </div>

          {error && (
            <div className="border border-accent/30 bg-accent/5 rounded-lg px-4 py-3 text-sm font-mono text-accent">
              ✕ {error}
            </div>
          )}

          {/* Result if exists */}
          {step === 3 && resultImage && (
            <div className="chrome-card">
              <div className="chrome-bar">
                <div className="chrome-dot" /><div className="chrome-dot" />
                <span className="text-xs font-mono text-muted ml-2">result.png</span>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <img src={resultImage} alt="Artistic QR" className="max-w-sm w-full rounded-lg shadow-lg" />
                <div className="flex gap-3">
                  <button onClick={handleDownload}
                    className="bg-accent text-white font-display font-bold px-8 py-3 rounded-lg hover:bg-ink transition-colors">
                    ↓ Download PNG
                  </button>
                  <button onClick={() => { setStep(1); setResultImage(null); }}
                    className="border border-border px-6 py-3 rounded-lg font-mono text-sm hover:border-ink transition-colors">
                    Generate another
                  </button>
                </div>
                <p className="text-xs text-muted font-mono">
                  ✦ Always test scan before sharing — aim for QR strength 1.3–1.7
                </p>
              </div>
            </div>
          )}
{/* DEBUG — add this temporarily */}
<button
  onClick={async () => {
    const b64 = await generateBaseQR();
    const img = document.createElement("img");
    img.src = `data:image/png;base64,${b64}`;
    img.style.position = "fixed";
    img.style.top = "10px";
    img.style.right = "10px";
    img.style.width = "200px";
    img.style.zIndex = "9999";
    img.style.border = "3px solid red";
    document.body.appendChild(img);
    console.log("Base QR b64 length:", b64.length);
  }}
  className="border border-red-500 text-red-500 px-4 py-2 rounded font-mono text-xs"
>
  Debug: Show Base QR
</button>
          <button
            onClick={handleGenerate}
            disabled={!url.trim() || !prompt.trim()}
            className="w-full bg-ink text-bg font-display font-bold py-4 rounded-xl hover:bg-accent transition-colors text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ◈ Generate Artistic QR
          </button>
        </div>
      )}

      {/* Step 2 — Generating */}
      {step === 2 && (
        <div className="chrome-card">
          <div className="chrome-bar">
            <div className="chrome-dot" /><div className="chrome-dot" />
            <span className="text-xs font-mono text-muted ml-2">generating...</span>
          </div>
          <div className="p-16 flex flex-col items-center gap-6 text-center">
            <div className="text-5xl animate-spin">◌</div>
            <div>
              <p className="font-display font-bold text-xl text-ink">Generating your artwork</p>
              <p className="text-muted font-mono text-sm mt-2">
                Stable Diffusion is painting your QR code.<br />
                This takes 30–90 seconds on the T4 GPU.
              </p>
            </div>
            <div className="w-64 h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-xs font-mono text-muted">
              Prompt: "{prompt.slice(0, 60)}{prompt.length > 60 ? "…" : ""}"
            </p>
          </div>
        </div>
      )}

    </div>
  );
}