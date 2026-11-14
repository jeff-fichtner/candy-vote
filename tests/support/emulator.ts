import { spawn, type ChildProcess } from 'node:child_process';

/**
 * Starts the Firestore emulator (gcloud's cloud-firestore-emulator component, Java 21+) on
 * `hostPort` and resolves once it is serving. The emulator runs in its own process group, so
 * `stop` ends gcloud and the Java server it starts.
 */
export async function startEmulator(hostPort: string): Promise<{ stop: () => void }> {
  const child: ChildProcess = spawn(
    'gcloud',
    ['emulators', 'firestore', 'start', `--host-port=${hostPort}`],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const stop = () => {
    if (child.pid !== undefined && child.exitCode === null) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
    }
  };
  await new Promise<void>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`The Firestore emulator did not start within 60s:\n${output}`));
    }, 60_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('Dev App Server is now running')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`The Firestore emulator could not be started: ${error.message}`));
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`The Firestore emulator exited (${code}) before serving:\n${output}`));
    });
  });
  return { stop };
}
