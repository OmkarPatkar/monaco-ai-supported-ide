const { spawn } = require('child_process');
const path = require('path');

// Start backend server
const backend = spawn('python', ['server.py'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit'
});

// Start frontend (Electron app)
const frontend = spawn('npm', ['start'], {
    stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    process.exit();
});

backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    frontend.kill();
    process.exit(code);
});

frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    backend.kill();
    process.exit(code);
}); 