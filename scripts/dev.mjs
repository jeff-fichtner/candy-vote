/**
 * Dev runner. In order:
 *
 * 1. starts the Firestore emulator at FIRESTORE_EMULATOR_HOST (.env sets it) and waits until it
 *    serves;
 * 2. starts the Vite dev server for the frontend and the Express API (via tsx) alongside it.
 *
 * Any child that exits stops everything. The emulator runs in its own process group, so stopping
 * it ends gcloud and the Java server it starts.
 */
import './load-env.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const binDir = fileURLToPath(new URL('../node_modules/.bin/', import.meta.url));
/** Resolves a locally-installed CLI binary (Windows uses the .cmd shim). */
const bin = (name) => `${binDir}${name}${process.platform === 'win32' ? '.cmd' : ''}`;

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];
/** @type {import('node:child_process').ChildProcess | null} */
let emulator = null;

function stopAll(code) {
  for (const child of children) child.kill();
  if (emulator?.pid !== undefined && emulator.exitCode === null) {
    try {
      process.kill(-emulator.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  process.exit(code);
}

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: false });
  child.on('exit', (code) => stopAll(code ?? 0));
  children.push(child);
  return child;
}

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  console.error('FIRESTORE_EMULATOR_HOST is required for npm run dev and is not set (.env).');
  process.exit(1);
}

await new Promise((resolve) => {
  emulator = spawn('gcloud', ['emulators', 'firestore', 'start', `--host-port=${emulatorHost}`], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const onData = (chunk) => {
    output += chunk.toString();
    if (output.includes('Dev App Server is now running')) {
      console.log(`Firestore emulator running at ${emulatorHost}.`);
      resolve();
    }
  };
  emulator.stdout.on('data', onData);
  emulator.stderr.on('data', onData);
  emulator.on('error', (error) => {
    console.error(
      `The Firestore emulator (gcloud cloud-firestore-emulator, Java 25+) could not start: ${error.message}`,
    );
    stopAll(1);
  });
  emulator.on('exit', (code) => {
    console.error(`The Firestore emulator exited (${code}).\n${output}`);
    stopAll(1);
  });
});

run(bin('vite'), []);

run(bin('tsx'), ['watch', 'src/server.ts']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopAll(0));
}
