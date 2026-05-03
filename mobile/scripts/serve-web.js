const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || '3000';
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const serveBin = path.join(__dirname, '..', 'node_modules', 'serve', 'build', 'main.js');

if (!fs.existsSync(distDir)) {
  console.error('Missing dist directory. Run `npm run build:web` before `npm start`.');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [serveBin, '-s', 'dist', '-l', `tcp://0.0.0.0:${port}`],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
