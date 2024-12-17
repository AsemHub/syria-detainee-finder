import { spawn } from 'child_process';
import waitOn from 'wait-on';
import { mkdir } from 'fs/promises';
import { join } from 'path';

async function setup() {
  console.log('Starting development server...');
  
  // Create .next/trace directory with proper permissions
  try {
    await mkdir(join(process.cwd(), '.next', 'trace'), { recursive: true });
  } catch (error) {
    console.warn('Warning: Could not create trace directory:', error);
  }
  
  // Start the dev server
  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      PORT: '3000' // Force port 3000
    }
  });

  // Listen for server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server output:', output);
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait for the server to be ready
  try {
    await waitOn({
      resources: ['http://localhost:3000'],
      timeout: 60000,
      interval: 1000,
      validateStatus: (status) => status === 200
    });
    console.log('Server is ready');
  } catch (error) {
    console.error('Server failed to start:', error);
    throw error;
  }

  // Add cleanup on process exit
  process.on('exit', () => {
    console.log('Cleaning up...');
    server.kill();
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT. Cleaning up...');
    server.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Cleaning up...');
    server.kill();
    process.exit();
  });

  return server;
}

export default setup;
