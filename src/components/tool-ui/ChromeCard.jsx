export default function ChromeCard({ title, children, bgClass = "bg-bg" }) {
  return (
    <div className="chrome-card">
      <div className="chrome-bar">
        <div className="chrome-dot" />
        <div className="chrome-dot" />
        {title && <span className="text-xs font-mono text-muted ml-2">{title}</span>}
      </div>
      <div className={`p-4 ${bgClass}`}>
        {children}
      </div>
    </div>
  );
}
