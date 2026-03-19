// ─────────────────────────────────────────────
//  TOOL REGISTRY
//  To add a new tool:
//  1. Create /src/tools/your-tool/meta.js
//  2. Create /src/tools/your-tool/Tool.jsx
//  3. Import meta here and add to the array
// ─────────────────────────────────────────────

import bgRemoverMeta from "./tools/bg-remover/meta";
import imageResizeMeta from "./tools/image-resize/meta";
import qrGeneratorMeta from "./tools/qr-generator/meta";

export const tools = [bgRemoverMeta, imageResizeMeta, qrGeneratorMeta];

export function getToolById(id) {
  return tools.find((t) => t.id === id) || null;
}
