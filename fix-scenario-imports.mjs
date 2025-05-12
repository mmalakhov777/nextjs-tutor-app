import fs from 'fs';
import path from 'path';

const scenariosDir = path.join(process.cwd(), 'src/data/scenarios');

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function getScenarioName(filename) {
  const base = path.basename(filename, '.ts');
  return toCamelCase(base);
}

function fixScenarioFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix ScenarioData import
  content = content.replace(
    /import \{ ScenarioData \} from ["']\.\.\/types["'];?/g,
    "import { ScenarioData } from '@/types/scenarios';"
  );

  // Fix MegaphoneIcon import
  content = content.replace(
    /import \{ MegaphoneIcon \} from ["']@heroicons\/react\/24\/outline["'];?/g,
    "import { MegaphoneIcon } from 'lucide-react';"
  );

  // Remove any duplicate correct imports
  content = content.replace(/(import \{ ScenarioData \} from '@\/types\/scenarios';\s*){2,}/g, "$1");
  content = content.replace(/(import \{ MegaphoneIcon \} from 'lucide-react';\s*){2,}/g, "$1");

  // Remove default export
  content = content.replace(/\n?export default [a-zA-Z0-9_]+;?\s*$/gm, '');

  // Replace const scenario: ScenarioData = { ... } with export const <name>: ScenarioData = { ... }
  const filename = path.basename(filePath, '.ts');
  const varName = toCamelCase(filename);
  content = content.replace(
    /const scenario(Data)?: ScenarioData = /,
    `export const ${varName}: ScenarioData = `
  );

  // Remove any trailing blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

fs.readdirSync(scenariosDir).forEach((file) => {
  if (file.endsWith('.ts')) {
    fixScenarioFile(path.join(scenariosDir, file));
  }
}); 