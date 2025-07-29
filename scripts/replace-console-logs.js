#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = ['node_modules', '.git', 'ios', 'android', 'scripts'];
const EXCLUDED_FILES = ['logger.js', 'replace-console-logs.js'];

let totalReplacements = 0;
let filesModified = 0;

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  return !EXCLUDED_FILES.includes(fileName) && 
         (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx'));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Track if we need to import logger
  let needsLoggerImport = false;
  let replacements = 0;
  
  // Replace console.log with logger.debug
  content = content.replace(/console\.log\(/g, (match) => {
    needsLoggerImport = true;
    replacements++;
    return 'logger.debug(';
  });
  
  // Replace console.info with logger.info
  content = content.replace(/console\.info\(/g, (match) => {
    needsLoggerImport = true;
    replacements++;
    return 'logger.info(';
  });
  
  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, (match) => {
    needsLoggerImport = true;
    replacements++;
    return 'logger.warn(';
  });
  
  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, (match) => {
    needsLoggerImport = true;
    replacements++;
    return 'logger.error(';
  });
  
  if (replacements > 0) {
    // Check if logger is already imported
    const hasLoggerImport = content.includes('from \'../utils/logger\'') || 
                           content.includes('from \'./utils/logger\'') ||
                           content.includes('from \'../../utils/logger\'');
    
    if (needsLoggerImport && !hasLoggerImport) {
      // Calculate relative path to logger
      const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '..', 'utils', 'logger.js'));
      const importPath = relativePath.replace(/\\/g, '/').replace('.js', '');
      
      // Add import at the top of the file
      const importStatement = `import { logger } from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n`;
      
      // Find the right place to insert the import
      const firstImportMatch = content.match(/^import .* from .*$/m);
      if (firstImportMatch) {
        // Add after the last import
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
      } else {
        // Add at the beginning of the file
        content = importStatement + '\n' + content;
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${filePath} (${replacements} replacements)`);
    totalReplacements += replacements;
    filesModified++;
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && !EXCLUDED_DIRS.includes(entry.name)) {
      processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      processFile(fullPath);
    }
  }
}

// Start processing from the project root
const projectRoot = path.join(__dirname, '..');
console.log('🔍 Scanning for console.log statements...\n');
processDirectory(projectRoot);

console.log(`\n✅ Complete! Modified ${filesModified} files with ${totalReplacements} total replacements.`);
console.log('\n⚠️  Please review the changes and test your app before committing.');