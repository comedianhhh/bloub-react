// Starts the demo server from this directory regardless of the caller's cwd.
process.chdir(__dirname)
require('child_process').spawn('corepack', ['pnpm', 'dev'], { stdio: 'inherit', shell: true })
