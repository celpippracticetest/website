// scripts/postbuild-cleanup.js
const fs = require('fs');
const path = require('path');

const chunksDir = path.join(__dirname, '..', '.next', 'static', 'chunks');

if (fs.existsSync(chunksDir)) {
  fs.readdirSync(chunksDir).forEach(file => {
    if (file.startsWith('polyfills-')) {
      fs.unlinkSync(path.join(chunksDir, file));
    }
  });
}