"use client";
import { useState, useEffect } from "react";
import { tools } from "@/registry";
import { useRouter } from "next/navigation";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Listen for Cmd+K (Mac) or Ctrl+K (Windows)
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter tools based on name, description, or tags
  const filteredTools = tools?.filter(tool =>
    tool.name.toLowerCase().includes(search.toLowerCase()) ||
    tool.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
    tool.description.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-bg/80 backdrop-blur-sm px-4" 
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="bg-card w-full max-w-xl border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-border">
          <span className="text-xl opacity-50">⌕</span>
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent border-none focus:ring-0 text-ink py-4 px-3 outline-none font-mono"
            placeholder="Search for tools... (try 'image' or 'ai')"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-xs text-muted font-mono border border-border px-1.5 py-0.5 rounded bg-bg">ESC</span>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredTools.length === 0 ? (
            <div className="p-8 text-center text-muted font-mono text-sm">
              No tools found for "{search}"
            </div>
          ) : (
            filteredTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => {
                  setIsOpen(false);
                  setSearch("");
                  router.push(tool.path);
                }}
                className="w-full text-left p-3 hover:bg-border rounded-lg flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl opacity-80">{tool.icon}</span>
                  <div>
                    <div className="text-ink font-bold">{tool.name}</div>
                    <div className="text-xs text-muted font-mono line-clamp-1">{tool.description}</div>
                  </div>
                </div>
                <span className="text-muted opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs">
                  Press Enter ↵
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
