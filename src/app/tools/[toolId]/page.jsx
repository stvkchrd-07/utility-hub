import { tools } from "@/registry";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// PRE-BUILD EXPORT: This tells Next.js to compile all 50+ tools into static HTML at build time
export function generateStaticParams() {
  return tools.map((tool) => ({ toolId: tool.id }));
}

export default function ToolPage({ params }) {
  const tool = tools.find((t) => t.id === params.toolId);
  
  if (!tool) {
    notFound();
  }

  const ToolComponent = tool.component;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink mb-2">
            {tool.name}
          </h1>
          <p className="text-muted font-mono">{tool.description}</p>
        </div>
        
        <ToolComponent />
      </main>
      <Footer />
    </div>
  );
}
