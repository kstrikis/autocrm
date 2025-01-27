import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Function to get all TypeScript/JavaScript files recursively
function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  readdirSync(dir).forEach(file => {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        files.push(...getAllFiles(fullPath));
      }
    } else if (fullPath.match(/\.(tsx?|jsx?)$/)) {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Get all source files
const srcDir = join(process.cwd(), 'src');
const files = getAllFiles(srcDir);

// Check each file for references
files.forEach(file => {
  const filename = file.split('/').pop()!;
  const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  try {
    // Search for imports or references to this file
    const grepResult = execSync(
      `git grep -l "${filenameWithoutExt}" -- "*.ts" "*.tsx" "*.js" "*.jsx" | grep -v "${filename}$" || true`,
      { encoding: 'utf8' }
    ).trim();
    
    // If no references found (excluding self-references)
    if (!grepResult) {
      // Additional check for default exports
      const defaultExportResult = execSync(
        `git grep -l "from.*${filenameWithoutExt}" -- "*.ts" "*.tsx" "*.js" "*.jsx" | grep -v "${filename}$" || true`,
        { encoding: 'utf8' }
      ).trim();
      
      if (!defaultExportResult) {
        console.log(`Potentially orphaned file: ${file}`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});
