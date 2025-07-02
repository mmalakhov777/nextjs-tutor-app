#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Color patterns to replace with #232323
const BLACK_PATTERNS = [
  // Hex colors
  /#232323/gi,
  /#232323/gi,
  
  // RGB colors
  /rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/gi,
  /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[\d.]+\s*\)/gi,
  
  // HSL colors
  /hsl\(\s*0\s*,\s*0%\s*,\s*0%\s*\)/gi,
  /hsla\(\s*0\s*,\s*0%\s*,\s*0%\s*,\s*[\d.]+\s*\)/gi,
  
  // CSS color keywords
  /\bblack\b/gi,
  
  // Tailwind classes
  /\bbg-black\b/g,
  /\btext-black\b/g,
  /\bborder-black\b/g,
  /\bfrom-black\b/g,
  /\bto-black\b/g,
  /\bvia-black\b/g,
  /\bring-black\b/g,
  /\bshadow-black\b/g,
  /\baccent-black\b/g,
  /\bcaret-black\b/g,
  /\bfill-black\b/g,
  /\bstroke-black\b/g,
  /\boutline-black\b/g,
  /\bdecoration-black\b/g,
  /\bdivide-black\b/g,
  /\bplaceholder-black\b/g,
];

// Replacement values
const REPLACEMENTS = {
  '#232323': '#232323',
  '#232323': '#232323',
  'rgb(35, 35, 35)': 'rgb(35, 35, 35)',
  'black': '#232323',
  'bg-[#232323]': 'bg-[#232323]',
  'text-[#232323]': 'text-[#232323]',
  'border-[#232323]': 'border-[#232323]',
  'from-[#232323]': 'from-[#232323]',
  'to-[#232323]': 'to-[#232323]',
  'via-[#232323]': 'via-[#232323]',
  'ring-[#232323]': 'ring-[#232323]',
  'shadow-[#232323]': 'shadow-[#232323]',
  'accent-[#232323]': 'accent-[#232323]',
  'caret-[#232323]': 'caret-[#232323]',
  'fill-[#232323]': 'fill-[#232323]',
  'stroke-[#232323]': 'stroke-[#232323]',
  'outline-[#232323]': 'outline-[#232323]',
  'decoration-[#232323]': 'decoration-[#232323]',
  'divide-[#232323]': 'divide-[#232323]',
  'placeholder-[#232323]': 'placeholder-[#232323]',
};

// File extensions to process
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass', '.less', '.html', '.vue', '.svelte', '.json', '.md', '.mdx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.nuxt', '.vscode', '.idea', 'coverage'];

// Files to skip
const SKIP_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

let totalFilesProcessed = 0;
let totalReplacements = 0;
let changedFiles = [];

function shouldSkipPath(filePath) {
  const parts = filePath.split(path.sep);
  return SKIP_DIRS.some(dir => parts.includes(dir));
}

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (SKIP_FILES.includes(fileName)) return false;
  if (!EXTENSIONS.includes(ext)) return false;
  if (shouldSkipPath(filePath)) return false;
  
  return true;
}

function replaceBlackColors(content) {
  let newContent = content;
  let replacementCount = 0;
  
  // Replace hex colors
  newContent = newContent.replace(/#232323/gi, (match) => {
    replacementCount++;
    return '#232323';
  });
  
  newContent = newContent.replace(/#232323\b/gi, (match) => {
    replacementCount++;
    return '#232323';
  });
  
  // Replace RGB colors
  newContent = newContent.replace(/rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/gi, (match) => {
    replacementCount++;
    return 'rgb(35, 35, 35)';
  });
  
  newContent = newContent.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/gi, (match, alpha) => {
    replacementCount++;
    return `rgba(35, 35, 35, ${alpha})`;
  });
  
  // Replace HSL colors
  newContent = newContent.replace(/hsl\(\s*0\s*,\s*0%\s*,\s*0%\s*\)/gi, (match) => {
    replacementCount++;
    return 'hsl(0, 0%, 14%)'; // #232323 in HSL
  });
  
  newContent = newContent.replace(/hsla\(\s*0\s*,\s*0%\s*,\s*0%\s*,\s*([\d.]+)\s*\)/gi, (match, alpha) => {
    replacementCount++;
    return `hsla(0, 0%, 14%, ${alpha})`;
  });
  
  // Replace CSS color keyword 'black' (but be careful not to replace it in other contexts)
  newContent = newContent.replace(/:\s*black\s*[;}]/gi, (match) => {
    replacementCount++;
    return match.replace('black', '#232323');
  });
  
  newContent = newContent.replace(/=\s*["']black["']/gi, (match) => {
    replacementCount++;
    return match.replace('black', '#232323');
  });
  
  // Replace Tailwind classes
  Object.entries(REPLACEMENTS).forEach(([oldValue, newValue]) => {
    if (oldValue.startsWith('bg-') || oldValue.startsWith('text-') || oldValue.includes('-black')) {
      const regex = new RegExp(`\\b${oldValue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      newContent = newContent.replace(regex, (match) => {
        replacementCount++;
        return newValue;
      });
    }
  });
  
  return { content: newContent, count: replacementCount };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, count } = replaceBlackColors(content);
    
    if (count > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      changedFiles.push({ file: filePath, replacements: count });
      totalReplacements += count;
      console.log(`✅ ${filePath}: ${count} replacements`);
    }
    
    totalFilesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!shouldSkipPath(filePath)) {
          walkDirectory(filePath);
        }
      } else if (shouldProcessFile(filePath)) {
        processFile(filePath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error.message);
  }
}

function main() {
  console.log('🔍 Starting black color replacement with #232323...\n');
  
  const startTime = Date.now();
  const rootDir = process.cwd();
  
  walkDirectory(rootDir);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Summary:');
  console.log(`├── Files processed: ${totalFilesProcessed}`);
  console.log(`├── Files changed: ${changedFiles.length}`);
  console.log(`├── Total replacements: ${totalReplacements}`);
  console.log(`└── Time taken: ${duration}s`);
  
  if (changedFiles.length > 0) {
    console.log('\n📝 Changed files:');
    changedFiles.forEach(({ file, replacements }) => {
      console.log(`├── ${file} (${replacements} changes)`);
    });
  }
  
  console.log('\n✨ Black color replacement completed!');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { replaceBlackColors, processFile, walkDirectory }; 