/** Project-local macOS development wrapper; the shared Electron installation stays untouched. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Return a launchable development binary with the product's menu identity. */
export function developmentElectron() {
  const require = createRequire(import.meta.url)
  const binary = require('electron')
  if (process.platform !== 'darwin') return binary
  const source = resolve(dirname(binary), '../..')
  const version = require('electron/package.json').version
  const key = createHash('sha256').update(`${source}:${version}:menu-v1`).digest('hex').slice(0, 16)
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.artifacts/desktop-dev', key)
  const target = join(root, 'Open DSH Desktop.app')
  if (!existsSync(join(root, 'ready'))) {
    mkdirSync(root, { recursive: true })
    const staging = mkdtempSync(join(root, 'preparing-'))
    try {
      const bundle = join(staging, 'Open DSH Desktop.app')
      cpSync(source, bundle, { recursive: true, verbatimSymlinks: true })
      const plist = join(bundle, 'Contents', 'Info.plist')
      for (const name of ['CFBundleName', 'CFBundleDisplayName']) {
        try { execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${name} Open DSH Desktop`, plist], { stdio: 'pipe' }) }
        catch { execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${name} string Open DSH Desktop`, plist], { stdio: 'pipe' }) }
      }
      execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'pipe' })
      // The bundle identifier and executable name are deliberately unchanged.
      renameSync(bundle, target)
      writeFileSync(join(root, 'ready'), version)
    } finally { rmSync(staging, { recursive: true, force: true }) }
  }
  return join(target, 'Contents', 'MacOS', 'Electron')
}
