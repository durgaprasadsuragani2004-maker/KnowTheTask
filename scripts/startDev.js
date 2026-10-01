const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting KnowTheTask Full-Stack Platform in Development Mode...\n');

const server = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../server'),
  stdio: 'inherit',
  shell: true,
});

const client = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../client'),
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n🛑 Shutting down KnowTheTask services...');
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
