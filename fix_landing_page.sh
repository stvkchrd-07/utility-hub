#!/bin/bash
echo "Redesigning landing page for mobile optimization and new messaging..."

cat << 'INNER_EOF' > src/app/page.jsx
import { tools } from "@/registry";
import ToolCard from "@/components/ToolCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  const toolList = tools || [];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <Navbar />
      
      <main className="flex-grow pb-12 sm:pb-16">
        {/* Mobile-Optimized Header */}
        {/* Reduced top padding on mobile (pt-12) vs desktop (pt-24) to save screen space */}
        <header className="pt-12 pb-8 px-4 sm:pt-24 sm:pb-12 sm:px-8 lg:px-12 max-w-7xl mx-auto border-b border-border mb-8 sm:mb-10">
          <div className="max-w-3xl space-y-4 sm:space-y-6">
            
            {/* New Cloud-Powered Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-bg border border-border text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-bg animate-pulse"></span>
              Cloud-Powered
            </div>
            
            {/* Scaled Typography for mobile */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold text-ink leading-[1.1] tracking-tight">
              Powerful utility tools, <br className="hidden sm:block" />
              <span className="text-muted">ready in an instant.</span>
            </h1>
            
            <p className="text-sm sm:text-base text-muted max-w-xl font-mono pt-2">
              A curated collection of developer and design tools built to speed up your workflow. Fast, reliable, and easy to use.
            </p>
          </div>
        </header>

        {/* Mobile-Friendly Tools Grid */}
        <div className="px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-widest border-b-2 border-ink pb-1">
              Available Tools
            </h2>
            <span className="text-xs font-mono font-bold bg-ink text-bg px-2 py-1 rounded">
              {toolList.length} tools
            </span>
          </div>
          
          {/* Tighter gaps on mobile (gap-4) expanding on larger screens (gap-6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {toolList.map((tool) => (
              <ToolCard key={tool.id || tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
INNER_EOF

echo "Done! The landing page is now mobile-friendly and messaging is updated."
