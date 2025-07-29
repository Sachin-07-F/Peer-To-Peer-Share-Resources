const fs = require('fs');
require('dotenv').config();


// Your existing config.js generation code
const configContent = `window.__env = {
  API_BASE: '${process.env.API_BASE || 'https://peer-to-peer-share-resources.onrender.com'}'
};`;

fs.writeFileSync('public/config.js', configContent);

// Copy router.js to public folder
fs.copyFileSync('router.js', 'public/router.js');

console.log('Environment config generated');
