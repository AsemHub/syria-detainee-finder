import { spawn } from 'child_process';
import waitOn from 'wait-on';

async function setup() {
  // Start the dev server
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });

  let port;
  
  // Listen for the port number from server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/localhost:(\d+)/);
    if (match && match[1]) {
      port = match[1];
      process.env.TEST_PORT = port;
    }
  });

  // Wait for the server to be ready
  await new Promise((resolve) => {
    const checkPort = setInterval(() => {
      if (port) {
        clearInterval(checkPort);
        resolve();
      }
    }, 100);
  });

  // Wait for the server to respond
  await waitOn({
    resources: [`http://localhost:${port}`],
    timeout: 30000,
  });

  // Return the teardown function
  return () => {
    server.kill();
  };
}

export default setup;
