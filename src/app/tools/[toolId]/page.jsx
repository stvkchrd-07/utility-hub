import { notFound } from "next/navigation";
import { Suspense, lazy } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getToolById, tools } from "@/registry";

export const dynamic = "force-dynamic";
// Generate static params for all registered tools
export function generateStaticParams() {
  return tools.map((tool) => ({ toolId: tool.id }));
}

// Dynamic metadata per tool
export async function generateMetadata({ params }) {
  const tool = getToolById(params.toolId);
  if (!tool) return { title: "Tool not found" };
  return {
    title: `${tool.name} — UtilityHub`,
    description: tool.description,
  };
}

// Lazy-load each tool component
const toolComponents = {
  "bg-remover": () => import("@/tools/bg-remover/Tool"),
  "image-resize": () => import("@/tools/image-resize/Tool"),
  "qr-generator": () => import("@/tools/qr-generator/index"),
  // ─── Add new tools here ───
  // "your-tool-id": () => import("@/tools/your-tool/Tool"),
};

export default async function ToolPage({ params }) {
  const tool = getToolById(params.toolId);
  if (!tool) notFound();

  const loader = toolComponents[params.toolId];
  if (!loader) notFound();

  const { default: ToolComponent } = await loader();

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted mb-8 animate-fade-up anim-delay-1">
          <a href="/" className="hover:text-ink transition-colors">
            Home
          </a>
          <span>→</span>
          <a href="/#tools" className="hover:text-ink transition-colors">
            Tools
          </a>
          <span>→</span>
          <span className="text-ink">{tool.name}</span>
        </div>

        {/* Tool header */}
        <div className="mb-10 animate-fade-up anim-delay-2">
          <div className="flex items-start gap-4">
            <span className="text-4xl text-accent">{tool.icon}</span>
            <div>
              <h1 className="font-display font-black text-4xl text-ink">
                {tool.name}
              </h1>
              <p className="text-muted mt-2 leading-relaxed max-w-lg">
                {tool.description}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-10" />

        {/* Tool content */}
        <div className="animate-fade-up anim-delay-3">
          <Suspense
            fallback={
              <div className="text-center py-20 text-muted font-mono text-sm">
                Loading tool…
              </div>
            }
          >
            <ToolComponent />
          </Suspense>
        </div>
      </div>

      <Footer />
    </main>
  );
}
