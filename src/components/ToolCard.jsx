import Link from "next/link";

const statusConfig = {
  new: { label: "NEW", color: "bg-accent text-white" },
  popular: { label: "POPULAR", color: "bg-ink text-bg" },
  beta: { label: "BETA", color: "bg-muted text-white" },
};

export default function ToolCard({ tool, index = 0 }) {
  const delayClass = `anim-delay-${Math.min(index + 1, 6)}`;

  return (
    <Link href={tool.path} className={`chrome-card block animate-fade-up ${delayClass}`}>
      {/* Browser chrome top bar */}
      <div className="chrome-bar justify-between">
        <div className="flex items-center gap-1.5">
          <div className="chrome-dot" />
          <div className="chrome-dot" />
          <span className="text-xs font-mono text-muted ml-2">
            {tool.id}.tool
          </span>
        </div>
        {tool.status && statusConfig[tool.status] && (
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${statusConfig[tool.status].color}`}
          >
            {statusConfig[tool.status].label}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-6">
        <div className="text-3xl mb-4 text-accent">{tool.icon}</div>
        <h3 className="font-display font-bold text-xl text-ink mb-1">
          {tool.name}
        </h3>
        <p className="text-sm text-muted mb-4 leading-relaxed">
          {tool.tagline}
        </p>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-mono text-muted border border-border px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-5">
        <div className="flex items-center gap-2 text-sm font-display font-semibold text-ink group-hover:text-accent transition-colors">
          Open tool
          <span className="text-accent">↗</span>
        </div>
      </div>
    </Link>
  );
}
