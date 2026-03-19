export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="font-display font-black text-lg text-ink">
            utility<span className="text-accent">hub</span>
          </span>
          <p className="text-xs text-muted font-mono mt-1">
            Free tools that run in your browser.
          </p>
        </div>
        <div className="flex gap-6 text-xs font-mono text-muted">
          <a href="#" className="hover:text-ink transition-colors">
            Privacy
          </a>
          <a href="https://github.com" className="hover:text-ink transition-colors">
            GitHub
          </a>
          <span className="text-border">·</span>
          <span>Built with Next.js</span>
        </div>
      </div>
    </footer>
  );
}
