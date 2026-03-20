import Navbar from "@/components/Navbar";
import ToolCard from "@/components/ToolCard";
import Footer from "@/components/Footer";
import { tools } from "@/registry";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6 animate-fade-up anim-delay-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Free · Browser-based · No account needed
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-black text-[clamp(2.4rem,11vw,7rem)] leading-[0.92] text-ink animate-fade-up anim-delay-2">
              Image
              <br />
              <span className="text-accent">Tools.</span>
              <br />
              Fast.
            </h1>
          </div>

          <div className="md:max-w-xs animate-fade-up anim-delay-3">
            <p className="text-base text-muted leading-relaxed">
              Resize, compress, remove backgrounds — all in your browser.
              No uploads to servers. No waiting. Just instant results.
            </p>
            <a
              href="#tools"
              className="inline-flex items-center gap-2 mt-6 bg-ink text-bg font-display font-bold px-6 py-3 rounded-lg hover:bg-accent transition-colors"
            >
              Explore tools ↓
            </a>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden animate-fade-up anim-delay-4">
          {[
            { n: tools.length, label: "Tools available" },
            { n: "0", label: "Server uploads" },
            { n: "100%", label: "Free forever" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-6 py-5">
              <div className="font-display font-black text-3xl text-ink">
                {stat.n}
              </div>
              <div className="text-xs font-mono text-muted mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick links bar ── */}
      <section className="border-y border-border bg-card overflow-hidden animate-fade-in anim-delay-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto divide-x divide-border">
            {tools.map((tool) => (
              <a
                key={tool.id}
                href={tool.path}
                className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 text-sm font-mono text-muted hover:text-ink hover:bg-bg transition-all flex-[0_0_220px] sm:flex-1"
              >
                <span>{tool.name}</span>
                <span className="text-accent">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools Grid ── */}
      <section id="tools" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-8 sm:mb-10 gap-2">
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ink">
            All Tools
          </h2>
          <span className="text-xs font-mono text-muted">
            {tools.length} tools · more coming
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}

          {/* Placeholder card for future tools */}
          <div className="chrome-card opacity-50 border-dashed">
            <div className="chrome-bar">
              <div className="chrome-dot" />
              <div className="chrome-dot" />
              <span className="text-xs font-mono text-muted ml-2">coming.soon</span>
            </div>
            <div className="p-6 flex flex-col items-start justify-between h-36 sm:h-40">
              <div className="text-3xl text-border">+</div>
              <div>
                <p className="font-display font-bold text-muted">More tools</p>
                <p className="text-xs font-mono text-muted mt-1">
                  Format converter, compressor & more
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About section ── */}
      <section
        id="about"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16 border-t border-border"
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-ink mb-4">
              Why UtilityHub?
            </h2>
            <div className="space-y-4 text-muted leading-relaxed">
              <p>
                Most image tools upload your files to a server, process them
                there, and send them back. That&apos;s slow, requires accounts, and
                raises privacy concerns.
              </p>
              <p>
                Every tool here runs entirely in your browser using WebAssembly
                and the Canvas API. Your files never leave your device.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "⚡", label: "Instant", desc: "No server round-trips" },
              { icon: "🔒", label: "Private", desc: "Files stay on your device" },
              { icon: "∞", label: "Free", desc: "No account, no limits" },
              { icon: "⊞", label: "Open", desc: "MIT licensed on GitHub" },
            ].map((item) => (
              <div
                key={item.label}
                className="chrome-card p-4"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-display font-bold text-ink text-sm">
                  {item.label}
                </div>
                <div className="text-xs text-muted font-mono mt-0.5">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
