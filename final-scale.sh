#!/bin/bash
echo "Adding Navbar and Footer to the Home Page..."

cat << 'EOF' > src/app/page.jsx
import { tools } from "@/registry";
import ToolCard from "@/components/ToolCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  const toolList = tools || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pb-16">
        {/* Sleek Minimal Header */}
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

        {/* Tools Grid */}
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

      <Footer />
    </div>
  );
}
EOF

echo "Cleaning up..."
rm fix-nav.sh

echo "Done! The landing page is updated."