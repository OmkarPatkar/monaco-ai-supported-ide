const fs = require('fs-extra');
const path = require('path');

// Copy Monaco Editor files
const monacoSource = path.join(__dirname, 'node_modules', 'monaco-editor', 'min', 'vs');
const monacoDestination = path.join(__dirname, 'frontend', 'node_modules', 'monaco-editor', 'min', 'vs');

// Ensure the destination directory exists
fs.ensureDirSync(path.dirname(monacoDestination));

// Copy files
fs.copySync(monacoSource, monacoDestination);

console.log('✅ Monaco Editor files copied successfully!'); 