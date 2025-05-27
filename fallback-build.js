const fs = require('fs');
const path = require('path');

// Check if the App.backup.js exists
const backupPath = path.join(__dirname, 'src', 'App.backup.js');
const appPath = path.join(__dirname, 'src', 'App.js');

if (fs.existsSync(backupPath)) {
  console.log('Backup App.js found. Checking original App.js size...');
  
  // Check if the original App.js is very large (which might cause build issues)
  const stats = fs.statSync(appPath);
  const fileSizeInKB = stats.size / 1024;
  
  if (fileSizeInKB > 50) {
    console.log(`Original App.js is large (${fileSizeInKB.toFixed(2)} KB). Creating backup...`);
    
    // Create a backup of the original file
    fs.copyFileSync(appPath, `${appPath}.original`);
    
    // Replace with the simplified version
    fs.copyFileSync(backupPath, appPath);
    
    console.log('Replaced App.js with simplified version for build');
  } else {
    console.log('Original App.js is a reasonable size. Keeping as is.');
  }
} else {
  console.log('No backup App.js found. Proceeding with original.');
} 