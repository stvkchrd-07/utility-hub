#!/bin/bash
echo "Upgrading Registry to strictly Client-Side Rendering (SSR: false)..."

# 1. Update the Registry Generator Script
cat << 'INNER_EOF' > scripts/generate-registry.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsDir = path.join(__dirname, '../src/tools');
const registryFile = path.join(__dirname, '../src/registry.js');

const toolFolders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

// Import next/dynamic exactly once at the top
let imports = '// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\nimport dynamic from "next/dynamic";\n';
let exports = 'export const tools = [\n';

toolFolders.forEach(folder => {
  const metaPath = path.join(toolsDir, folder, 'meta.js');
  const toolPath = path.join(toolsDir, folder, 'Tool.jsx');
  
  if (fs.existsSync(metaPath)) {
    const varName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Meta';
    const compName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Component';
    
    imports += `import ${varName} from "./tools/${folder}/meta";\n`;
    
    if (fs.existsSync(toolPath)) {
      // MAGIC FIX: This forces the tool to ONLY load in the browser, bypassing the SSR crash!
      imports += `const ${compName} = dynamic(() => import("./tools/${folder}/Tool"), { ssr: false });\n`;
      exports += `  { ...${varName}, component: ${compName} },\n`;
    } else {
      exports += `  ${varName},\n`;
    }
  }
});

exports += '];\n';

fs.writeFileSync(registryFile, imports + '\n' + exports);
console.log('✅ Auto-generated registry.js (with strict Client-Only loading!)');
INNER_EOF

# 2. Wipe the corrupted Next.js cache
echo "Clearing corrupted Next.js cache..."
rm -rf .next

echo "Done! Ready to start the server."
