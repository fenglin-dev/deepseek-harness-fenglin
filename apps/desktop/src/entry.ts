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

async function runManagedCliSmoke(): Promise<void> {
  if (packageSmokeRoot === undefined || process.platform !== 'win32') {
    throw new Error('desktop: managed CLI smoke requires a Windows package smoke root')
  }
  const runtimeRoot = join(process.resourcesPath, 'runtime', 'win32-x64')
  const nodeCommand = join(runtimeRoot, 'node.exe')
  const harnessBin = join(process.resourcesPath, 'harness', 'lib', 'bin.js')
  const [{ runHarnessInvocation }, { resolveHarnessInvocation }, { loadProcessObserver }] = await Promise.all([
    import('./harness-invocation.js'),
    import('./launch.js'),
    import('./process-observer.js'),
  ])
  const observer = await loadProcessObserver(harnessBin, nodeCommand)
  try {
    const output = await runHarnessInvocation(resolveHarnessInvocation({
      ...process.env,
      DSH_HOME: join(packageSmokeRoot, 'managed-cli-home'),
    }, ['--version'], {
      harnessBin,
      nodeCommand,
      packageManagerBin: join(runtimeRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'),
      runtimeBinPath: runtimeRoot,
    }), {
      kind: 'package-managed-cli-smoke',
      timeoutMs: 30_000,
      signal: new AbortController().signal,
      managedRuntime: observer,
    })
    console.log(`DSH_MANAGED_CLI_SMOKE_READY ${output.trim()}`)
  } finally {
    await observer.stopAll()
  }
}

if (process.argv.includes('--dsh-managed-cli-smoke')) {
  try {
    await runManagedCliSmoke()
    app.exit(0)
  } catch (error) {
    await recordPackageSmokeEntry(`managed CLI smoke failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    console.error(error)
    app.exit(1)
  }
} else if (process.argv.includes('--dsh-native-smoke')) {
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
  const mainImportSmoke = process.argv.includes('--dsh-main-import-smoke')
  await recordPackageSmokeEntry('importing main.js')
  try {
    await import('./main.js')
    await recordPackageSmokeEntry('main.js imported')
    if (mainImportSmoke) {
      console.log('DSH_MAIN_IMPORT_SMOKE_READY')
      app.exit(0)
    }
  } catch (error) {
    await recordPackageSmokeEntry(`main.js import failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    if (packageSmokeRoot !== undefined) app.exit(1)
    else throw error
  }
}
