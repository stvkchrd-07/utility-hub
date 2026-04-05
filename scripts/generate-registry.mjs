import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsDir = path.join(__dirname, '../src/tools');
const registryFile = path.join(__dirname, '../src/registry.js');

const toolFolders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

let imports = '// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n';
let exports = 'export const tools = [\n';

toolFolders.forEach(folder => {
  const metaPath = path.join(toolsDir, folder, 'meta.js');
  const toolPath = path.join(toolsDir, folder, 'Tool.jsx');
  
  if (fs.existsSync(metaPath)) {
    // Format variables (e.g., bg-remover -> bgRemoverMeta / bgRemoverComponent)
    const varName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Meta';
    const compName = folder.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Component';
    
    // Import the meta file
    imports += `import ${varName} from "./tools/${folder}/meta";\n`;
    
    // Import the Tool.jsx file if it exists, and merge them
    if (fs.existsSync(toolPath)) {
      imports += `import ${compName} from "./tools/${folder}/Tool";\n`;
      exports += `  { ...${varName}, component: ${compName} },\n`;
    } else {
      exports += `  ${varName},\n`;
    }
  }
});

exports += '];\n';

fs.writeFileSync(registryFile, imports + '\n' + exports);
console.log('✅ Auto-generated registry.js (now with Components!)');
