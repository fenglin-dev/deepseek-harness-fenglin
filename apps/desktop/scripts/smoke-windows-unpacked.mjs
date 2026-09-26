import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

if (process.platform !== 'win32') throw new Error(`Windows package probe requires win32, received ${process.platform}`)

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const unpackedRoot = join(repositoryRoot, '.artifacts', 'desktop-windows', 'win-unpacked')
const executable = join(unpackedRoot, 'Open DeepSeek Harness Desktop.exe')
const asarPath = join(unpackedRoot, 'resources', 'app.asar')
const require = createRequire(import.meta.url)
const electronBuilderRoot = dirname(require.resolve('electron-builder/package.json'))
const { listPackage } = require(require.resolve('@electron/asar', { paths: [electronBuilderRoot] }))

await access(executable)
await access(asarPath)

const requiredPackages = [
  '@deepseek-ai/dsh-subprocess',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-http-proxy',
]
const asarEntries = new Set(listPackage(asarPath).map(entry => entry.replaceAll('\\', '/')))
const runtimeLock = '/scripts/primary-runtime-lock.json'
if (!asarEntries.has(runtimeLock)) throw new Error(`Packaged app.asar is missing ${runtimeLock}`)
for (const packageName of requiredPackages) {
  const manifest = `/node_modules/${packageName}/package.json`
  if (!asarEntries.has(manifest)) throw new Error(`Packaged app.asar is missing ${manifest}`)
}

async function runProbe(argument, marker, timeoutMs = 30_000) {
  const root = await mkdtemp(join(tmpdir(), 'odsh-windows-package-probe-'))
  try {
    const result = await new Promise((resolvePromise, reject) => {
      const child = spawn(executable, [argument, `--dsh-package-smoke-root=${root}`], {
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
        windowsHide: true,
      })
      let stdout = ''
      let stderr = ''
      let timedOut = false
      child.stdout.on('data', chunk => { stdout += chunk })
      child.stderr.on('data', chunk => { stderr += chunk })
      const timeout = setTimeout(() => {
        timedOut = true
        child.kill()
      }, timeoutMs)
      child.once('error', error => { clearTimeout(timeout); reject(error) })
      child.once('close', code => {
        clearTimeout(timeout)
        resolvePromise({ code, stdout, stderr, timedOut })
      })
    })
    const entryLogPath = join(root, 'desktop-entry.log')
    const entryLog = await readFile(entryLogPath, 'utf8').catch(() => '')
    if (result.timedOut || result.code !== 0 || !result.stdout.includes(marker)) {
      let asarDiag = ''
      try {
        const { extractFile } = require(require.resolve('@electron/asar', { paths: [electronBuilderRoot] }))
        const mainJs = extractFile(asarPath, 'lib/main.js')
        const entryJs = extractFile(asarPath, 'lib/entry.js')
        const { SourceTextModule } = await import('node:vm')
        asarDiag += `\nasar main.js bytes=${mainJs.length} entry.js bytes=${entryJs.length}`
        try {
          new SourceTextModule(mainJs.toString('utf8'), { identifier: 'asar:lib/main.js' })
          asarDiag += '\nasar main.js parses as ESM'
        } catch (parseError) {
          asarDiag += `\nasar main.js PARSE FAIL: ${parseError}`
        }
      } catch (diagError) {
        asarDiag += `\nasar diag failed: ${diagError}`
      }
      throw new Error(`${argument} failed with ${result.code} (timedOut=${result.timedOut})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\nentry:\n${entryLog}${asarDiag}`)
    }
    console.log(`${marker}\n${entryLog}`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await runProbe('--dsh-native-smoke', 'DSH_NATIVE_SMOKE_READY')
await runProbe('--dsh-main-import-smoke', 'DSH_MAIN_IMPORT_SMOKE_READY')
// Client launch, range cleanup, CLI task, and final observer cleanup have separate deadlines.
await runProbe('--dsh-managed-cli-smoke', 'DSH_MANAGED_CLI_SMOKE_READY', 60_000)
console.log(`Windows app.asar contains ${requiredPackages.join(', ')}`)
