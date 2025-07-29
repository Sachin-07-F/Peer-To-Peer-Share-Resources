const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Generate config.js
const configContent = `window.__env = {
  API_BASE: '${process.env.API_BASE || 'https://peer-to-peer-share-resources.onrender.com'}'
};`;

fs.writeFileSync('public/config.js', configContent);

// Copy router.js from root to public
const routerSource = path.join(__dirname, 'router.js');
const routerDest = path.join('public', 'router.js');

if (fs.existsSync(routerSource)) {
  fs.copyFileSync(routerSource, routerDest);
  console.log('✅ router.js copied to public folder');
} else {
  console.log('⚠️ router.js not found in root directory');
  // Create minimal router if missing
  fs.writeFileSync(routerDest, `console.log('Router initialized');`);
}

console.log('✅ Build completed successfully');