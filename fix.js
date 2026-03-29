const fs = require('fs');
const path = require('path');

// 1. Delete .next cache and old broken models
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });
const modelsDir = path.join(__dirname, 'public/models/rmbg-1.4');
if (fs.existsSync(modelsDir)) fs.rmSync(modelsDir, { recursive: true, force: true });
console.log('✅ Cleared .next cache and old models');

// 2. Fix package.json
const pkgPath = path.join(__dirname, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  delete pkg.scripts.predev;
  delete pkg.scripts.prebuild;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('✅ Removed broken predev scripts from package.json');
}

// 3. Write clean page.jsx
const pageContent = `import { tools } from "../registry";
import ToolCard from "../components/ToolCard";

export default function Home() {
  const toolList = tools || [];

  return (
    <main className="min-h-screen pb-16">
      <header className="pt-24 pb-12 px-6 sm:px-12 max-w-7xl mx-auto border-b border-border mb-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-mono text-ink">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Runs 100% locally
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-ink leading-[1.1]">
            Privacy-first utility tools, <br className="hidden sm:block" />
            <span className="text-muted">ready in an instant.</span>
          </h1>
          <div className="flex flex-wrap gap-4 pt-2 sm:gap-8 text-sm font-mono text-muted">
            <div className="flex items-center gap-2">⚡ Instant processing</div>
            <div className="flex items-center gap-2">🔒 Zero server uploads</div>
            <div className="flex items-center gap-2">🆓 No account needed</div>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest">Available Tools</h2>
          <span className="text-xs font-mono text-muted bg-card px-2 py-1 rounded border border-border">
            {toolList.length} tools
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolList.map((tool) => (
            <ToolCard key={tool.id || tool.name} tool={tool} />
          ))}
        </div>
      </div>
    </main>
  );
}`;
fs.writeFileSync(path.join(__dirname, 'src/app/page.jsx'), pageContent, 'utf8');
console.log('✅ Created clean page.jsx (UTF-8)');

// 4. Write clean Tool.jsx for bg-remover
const toolContent = `"use client";

import { useRef, useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

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

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await removeBackground(originalImage.file, {
        progress: (key, current, total) => {
          if (total > 0) setProgress(Math.round((current / total) * 100));
        }
      });
      setResultImage(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(\`Failed to process image: \${err.message}\`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "background-removed.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {!originalImage && (
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-16 text-center cursor-pointer hover:border-ink transition-colors">
          <div className="text-5xl mb-4">✨</div>
          <p className="font-display font-bold text-xl text-ink">Upload image to remove background</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}
      {originalImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-bg"><img src={originalImage.url} alt="Original" className="max-h-64 mx-auto object-contain" /></div>
            <button onClick={handleRemoveBackground} disabled={isProcessing} className="w-full bg-ink text-bg font-bold py-3 rounded-lg disabled:opacity-50">
              {isProcessing ? \`Processing... \${progress}%\` : "Remove Background"}
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" /> : <div className="h-64 flex items-center justify-center text-muted font-mono">Result Preview</div>}
            </div>
            <button onClick={handleDownload} disabled={!resultImage} className="w-full bg-accent text-bg font-bold py-3 rounded-lg disabled:opacity-50">Download PNG</button>
            {error && <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync(path.join(__dirname, 'src/tools/bg-remover/Tool.jsx'), toolContent, 'utf8');
console.log('✅ Created clean Tool.jsx (UTF-8)');
console.log('🎉 All fixes applied! You can now start the server.');