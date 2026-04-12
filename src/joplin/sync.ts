import { execFile } from 'child_process';
import { SyncError } from './errors.js';

export function sync(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('joplin', ['sync'], { timeout: 60000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new SyncError(`joplin sync failed: ${error.message}${stderr ? ` (${stderr.trim()})` : ''}`));
        return;
      }
      resolve();
    });
  });
}
