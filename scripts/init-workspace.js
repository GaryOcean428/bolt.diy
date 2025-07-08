import fs from 'fs';
import path from 'path';

const dirs = [
  '/home/workspace',
  '/storage',
  '/tmp/workspace'
];

dirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  } catch (error) {
    console.log(`Cannot create directory ${dir}: ${error.message}`);
  }
});

// Create required WebContainer config
try {
  fs.writeFileSync('/home/workspace/.ready', 'true');
  console.log('WebContainer workspace initialized successfully');
} catch (error) {
  console.log('Workspace initialization skipped (likely not in server environment)');
}