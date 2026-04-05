"use client";

import Link from "next/link";
import CommandPalette from "./CommandPalette";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const triggerSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-bg/90 backdrop-blur z-40 flex items-center justify-between px-6 sm:px-12">
        <Link href="/" className="font-display font-bold text-xl text-ink tracking-tight flex items-center gap-2 hover:opacity-70 transition-opacity">
          <span className="w-4 h-4 bg-ink rounded-sm animate-pulse"></span>
          UtilityHub
        </Link>
        
        <button 
          onClick={triggerSearch}
          className="flex items-center gap-2 sm:gap-8 text-xs font-mono text-muted bg-card hover:bg-border px-3 py-1.5 rounded-md border border-border transition-colors group"
        >
          <span className="hidden sm:inline">Search tools...</span>
          <span className="sm:hidden">Search</span>
          <kbd className="font-sans font-bold bg-bg px-1.5 py-0.5 rounded border border-border group-hover:border-muted transition-colors">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </nav>
      
      {/* The invisible search modal that lives on every page */}
      <CommandPalette />
    </>
  );
}
