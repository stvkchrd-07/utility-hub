"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-black text-xl text-ink tracking-tight hover:text-accent transition-colors">
          utility<span className="text-accent">hub</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#tools" className="text-sm font-mono text-muted hover:text-ink transition-colors">
            Tools
          </Link>
          <Link href="/#about" className="text-sm font-mono text-muted hover:text-ink transition-colors">
            About
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-ink border border-border px-4 py-1.5 rounded-lg hover:border-ink hover:bg-card transition-all"
          >
            GitHub ↗
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-ink"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg px-6 py-4 space-y-4">
          <Link href="/#tools" className="block text-sm font-mono text-ink" onClick={() => setMenuOpen(false)}>
            Tools
          </Link>
          <Link href="/#about" className="block text-sm font-mono text-ink" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-mono text-ink"
          >
            GitHub ↗
          </a>
        </div>
      )}
    </nav>
  );
}
