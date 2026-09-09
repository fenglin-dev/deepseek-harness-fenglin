/** Run native ESM resolution assertions outside Vitest's module runner. */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

/** Execute a bounded source-plane assertion with Node's actual import.meta.resolve. */
export function nativeLaunchProbe(assertion: string): void {
  const require = createRequire(import.meta.url)
  const source = new URL('../src/launch.ts', import.meta.url).href
  const api = new URL('../src/index.ts', import.meta.url).href
  execFileSync(process.execPath, [
    '--import', pathToFileURL(require.resolve('tsx/esm')).href,
    '--input-type=module', '--eval',
    `import assert from 'node:assert/strict';
     import { existsSync } from 'node:fs';
     import { join, resolve } from 'node:path';
     import * as launch from ${JSON.stringify(source)};
     import * as sdk from ${JSON.stringify(api)};
     ${assertion}`,
  ], { encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024 })
}
