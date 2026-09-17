/** Native package probe exits before importing the stateful desktop host. */
import { app } from 'electron'
import { writeFileSync } from 'node:fs'
import { lstat } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

// Native package qualification must not acquire the installed user's instance lock or preferences.
const smokeRootArgument = process.argv.find(argument => argument.startsWith('--dsh-package-smoke-root='))
if (smokeRootArgument !== undefined) {
  const root = smokeRootArgument.slice('--dsh-package-smoke-root='.length)
  if (!isAbsolute(root) || dirname(resolve(root)) === resolve(root) || !(await lstat(root)).isDirectory()) {
    throw new Error('desktop: package smoke requires an existing absolute private data directory')
  }
  app.setPath('appData', root)
  try {
    writeFileSync(join(root, 'dsh-package-smoke-entry.json'), JSON.stringify({
      pid: process.pid,
      argv: process.argv,
      appData: root,
      at: new Date().toISOString(),
    }), { encoding: 'utf8' })
  } catch {
    // Diagnostics only; startup must continue.
  }
}

if (process.argv.includes('--dsh-native-smoke')) {
  const timeout = setTimeout(() => {
    app.exit(1)
  }, 10_000)
  void app.whenReady().then(() => {
    clearTimeout(timeout)
    console.log('DSH_NATIVE_SMOKE_READY')
    try {
      const markerRoot = smokeRootArgument === undefined
        ? process.cwd()
        : smokeRootArgument.slice('--dsh-package-smoke-root='.length)
      writeFileSync(join(markerRoot, 'dsh-native-smoke-ready.txt'), `ready ${new Date().toISOString()} pid=${process.pid}`, { encoding: 'utf8' })
    } catch {
      // Diagnostics only.
    }
    app.quit()
  }).catch((error: unknown) => {
    console.error(error)
    app.exit(1)
  })
} else {
  await import('./main.js')
}
