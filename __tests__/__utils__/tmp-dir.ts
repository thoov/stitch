import { realpathSync } from 'fs';
import tmp = require('tmp');

export function createTmpDir(): string {
  return realpathSync(tmp.dirSync({ unsafeCleanup: true }).name);
}
