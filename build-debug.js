// Build debugging script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Build Debugging Information ===');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);
console.log('NPM version:', execSync('npm --version').toString().trim());
console.log('Is Vercel Environment:', !!process.env.VERCEL);

// Check package.json
try {
  const packageJson = require('./package.json');
  console.log('Package name:', packageJson.name);
  console.log('React scripts version:', packageJson.dependencies['react-scripts']);
  console.log('Build script:', packageJson.scripts.build);
} catch (error) {
  console.error('Error reading package.json:', error.message);
}

// Try running the build with verbose logging
console.log('\n=== Attempting build with verbose logging ===');
try {
  execSync('CI=false npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully');
  
  // Copy owl-config.json to build directory
  console.log('\n=== Copying owl-config.json to build directory ===');
  try {
    const sourcePath = path.join(process.cwd(), 'src', 'owl-config.json');
    const destPath = path.join(process.cwd(), 'build', 'owl-config.json');
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log('Successfully copied owl-config.json to build directory');
    } else {
      console.error('Source owl-config.json not found at:', sourcePath);
    }
    
    // Verify the file was copied
    if (fs.existsSync(destPath)) {
      console.log('Verified owl-config.json exists in build directory');
    } else {
      console.error('owl-config.json was not copied to build directory');
    }
    
  } catch (copyError) {
    console.error('Error copying owl-config.json:', copyError.message);
  }
  
} catch (error) {
  console.error('Build failed:', error.message);
}

// Check node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
console.log('\nChecking node_modules directory:', nodeModulesPath);
if (fs.existsSync(nodeModulesPath)) {
  console.log('node_modules exists');
  
  // Check for critical packages
  const criticalPackages = [
    'react', 
    'react-dom', 
    'react-scripts'
  ];
  
  criticalPackages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    console.log(`${pkg}: ${fs.existsSync(pkgPath) ? 'Found' : 'MISSING'}`);
  });
} else {
  console.log('node_modules MISSING - this is a serious issue');
} 