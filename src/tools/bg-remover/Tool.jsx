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

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(30);

    try {
      const arrayBuffer = await originalImage.file.arrayBuffer();
      setProgress(60);

      const res = await fetch(
        "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN}`,
            "Content-Type": originalImage.file.type,
          },
          body: arrayBuffer,
        }
      );

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const blob = await res.blob();
      setProgress(100);
      setResultImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError("Failed. If first attempt, model may be loading — wait 20 seconds and try again.");
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
          <p className="text-xs text-muted font-mono mt-2">Powered by Hugging Face · files never leave your browser</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}
      {originalImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-bg"><img src={originalImage.url} alt="Original" className="max-h-64 mx-auto object-contain" /></div>
            <button onClick={handleRemoveBackground} disabled={isProcessing} className="w-full bg-ink text-bg font-bold py-3 rounded-lg disabled:opacity-50">
              {isProcessing ? `Processing... ${progress}%` : "Remove Background"}
            </button>
            <button onClick={() => { setOriginalImage(null); setResultImage(null); }} className="w-full border border-border py-2 rounded-lg font-mono text-sm hover:border-ink transition-colors">
              Start over
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" /> : <div className="h-64 flex items-center justify-center text-muted font-mono text-sm">Result will appear here</div>}
            </div>
            <button onClick={handleDownload} disabled={!resultImage} className="w-full bg-accent text-white font-bold py-3 rounded-lg disabled:opacity-50">
              ↓ Download PNG
            </button>
            {error && <p className="text-accent text-xs mt-2 font-mono border border-accent/30 bg-accent/5 rounded px-3 py-2">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
