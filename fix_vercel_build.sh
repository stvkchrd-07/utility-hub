#!/bin/bash
echo "Fixing syntax errors and SSR build issues for Vercel..."

# 1. Fix Tool.jsx (Remove the extra '}' at the end that causes Syntax Errors)
cat << 'INNER_EOF' > src/tools/bg-remover/Tool.jsx
"use client";

import { useState } from "react";
import Dropzone from "@/components/tool-ui/Dropzone";
import { useBlobManager } from "@/hooks/useBlobManager";

// Helper function to extract base64 text from a File
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = (error) => reject(error);
});

export default function BgRemoverTool() {
  const { createUrl } = useBlobManager();
  
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    
    // Vercel JSON payload limits us to ~4.5MB
    if (file.size > 4.5 * 1024 * 1024) {
      setError("Image is too large. Please use an image under 4.5MB.");
      return;
    }
    
    setOriginalImage({ file, url: createUrl(file) });
    setResultImage(null);
    setError(null);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage?.file) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const base64Data = await fileToBase64(originalImage.file);

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data })
      });

      if (!response.ok) {
        let errorMessage = "Failed to process image.";
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server crashed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      setResultImage(createUrl(blob));

    } catch (err) {
      console.error("Frontend Error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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
          subtitle="Powered by remove.bg API"
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
              {isProcessing ? "Processing instantly... ✨" : "Remove Background"}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
              {resultImage ? (
                <img src={resultImage} alt="Result" className="max-h-64 mx-auto object-contain" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-muted font-mono text-center px-4">
                  {isProcessing ? (
                    <span className="animate-pulse">Uploading to remove.bg...</span>
                  ) : (
                    "Result Preview"
                  )}
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
            {error && <p className="text-red-500 text-xs mt-2 font-mono break-words">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF

# 2. Update Registry Generator to use next/dynamic (Prevents Vercel SSR build failures)
cat << 'INNER_EOF' > scripts/generate-registry.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsDir = path.join(__dirname, '../src/tools');
const registryFile = path.join(__dirname, '../src/registry.js');

const toolFolders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

let imports = '// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\nimport dynamic from "next/dynamic";\n';
let exports = 'export const tools = [\n';

toolFolders.forEach(folder => {
  const metaPath = path.join(toolsDir, folder, 'meta.js');
  const toolPath = path.join(toolsDir, folder, 'Tool.jsx');
  
  if (fs.existsSync(metaPath)) {
    const varName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Meta';
    const compName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Component';
    
    imports += `import ${varName} from "./tools/${folder}/meta";\n`;
    
    if (fs.existsSync(toolPath)) {
      // Wrap in dynamic import to prevent Vercel SSR window/document errors during build
      imports += `const ${compName} = dynamic(() => import("./tools/${folder}/Tool"), { ssr: false });\n`;
      exports += `  { ...${varName}, component: ${compName} },\n`;
    } else {
      exports += `  ${varName},\n`;
    }
  }
});

exports += '];\n';

fs.writeFileSync(registryFile, imports + '\n' + exports);
console.log('✅ Auto-generated registry.js (with strict Client-Only loading!)');
INNER_EOF

echo "Done! The syntax error is fixed and SSR protections are in place."
