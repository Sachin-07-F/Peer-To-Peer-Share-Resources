const fs = require('fs');
require('dotenv').config();

// Read the env variables
const configContent = `window.__env = {
  API_BASE: '${process.env.API_BASE || 'https://peer-to-peer-share-resources.onrender.com'}'
};`;

// Write the config file
fs.writeFileSync('./public/config.js', configContent);  // ✅ Correct path
// Copy your HTML file (optional, if you need processing)
// fs.copyFileSync('src/index.html', 'public/index.html');

console.log('Environment config generated');