/** Native package probe exits before importing the stateful desktop host. */
import { app } from 'electron'
import { appendFile, lstat } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

// Native package qualification must not acquire the installed user's instance lock or preferences.
const smokeRootArgument = process.argv.find(argument => argument.startsWith('--dsh-package-smoke-root='))
let packageSmokeRoot: string | undefined
if (smokeRootArgument !== undefined) {
  const root = smokeRootArgument.slice('--dsh-package-smoke-root='.length)
  if (!isAbsolute(root) || dirname(resolve(root)) === resolve(root) || !(await lstat(root)).isDirectory()) {
    throw new Error('desktop: package smoke requires an existing absolute private data directory')
  }
  packageSmokeRoot = root
  app.setPath('appData', root)
}

async function recordPackageSmokeEntry(message: string): Promise<void> {
  if (packageSmokeRoot === undefined) return
  await appendFile(join(packageSmokeRoot, 'desktop-entry.log'), `${new Date().toISOString()} ${message}\n`, 'utf8')
}

if (process.argv.includes('--dsh-native-smoke')) {
  const timeout = setTimeout(() => {
    app.exit(1)
  }, 10_000)
  void app.whenReady().then(() => {
    clearTimeout(timeout)
    console.log('DSH_NATIVE_SMOKE_READY')
    app.quit()
  }).catch((error: unknown) => {
    console.error(error)
    app.exit(1)
  })
} else {
  await recordPackageSmokeEntry('importing main.js')
  try {
    await import('./main.js')
    await recordPackageSmokeEntry('main.js imported')
  } catch (error) {
    await recordPackageSmokeEntry(`main.js import failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    if (packageSmokeRoot !== undefined) app.exit(1)
    else throw error
  }
}
