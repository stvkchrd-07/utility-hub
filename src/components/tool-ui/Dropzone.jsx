import { useRef } from "react";

export default function Dropzone({ onFile, accept, title = "Upload File", subtitle = "Click or drag and drop" }) {
  const fileRef = useRef(null);
  
  const handleDrop = (e) => {
    e.preventDefault();
    onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div 
      onDrop={handleDrop} 
      onDragOver={(e) => e.preventDefault()} 
      onClick={() => fileRef.current?.click()}
      className="border-2 border-dashed border-border rounded-xl p-8 sm:p-16 text-center cursor-pointer hover:border-ink transition-colors"
    >
      <div className="text-5xl mb-4">⬆</div>
      <p className="font-display font-bold text-xl text-ink">{title}</p>
      <p className="text-muted text-sm mt-2">{subtitle}</p>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
