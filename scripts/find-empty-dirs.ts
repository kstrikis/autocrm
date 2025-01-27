import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function isDirectoryEmpty(path: string): boolean {
  try {
    const files = readdirSync(path);
    // Filter out .DS_Store files on macOS
    const realFiles = files.filter(file => file !== '.DS_Store');
    return realFiles.length === 0;
  } catch (error) {
    console.error(`Error reading directory ${path}:`, error);
    return false;
  }
}

function findEmptyDirs(dir: string, excludes: string[] = []): string[] {
  const emptyDirs: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const path = join(dir, item);
      
      // Skip excluded directories
      if (excludes.some(exclude => path.includes(exclude))) {
        continue;
      }
      
      try {
        const stats = statSync(path);
        if (stats.isDirectory()) {
          // Check if this directory is empty
          if (isDirectoryEmpty(path)) {
            emptyDirs.push(path);
          } else {
            // If not empty, check its subdirectories
            emptyDirs.push(...findEmptyDirs(path, excludes));
          }
        }
      } catch (error) {
        console.error(`Error processing ${path}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return emptyDirs;
}

const rootDir = process.cwd();
const excludes = ['node_modules', '.git'];
const emptyDirs = findEmptyDirs(rootDir, excludes);

if (emptyDirs.length > 0) {
  console.log('Found empty directories:');
  emptyDirs.forEach(dir => {
    // Convert to relative path for better readability
    const relativePath = dir.replace(rootDir + '/', '');
    console.log(relativePath);
  });
} else {
  console.log('No empty directories found.');
}
