const fs = require('fs');
const path = require('path');

// Ensure files exist
if (!fs.existsSync('public')) fs.mkdirSync('public');

// Generate config.js
fs.writeFileSync(
  path.join('public', 'config.js'),
  `window.__env = { API_BASE: '${process.env.API_BASE || 'https://your-render-backend.onrender.com'}' };`
);

console.log('✅ Config generated');