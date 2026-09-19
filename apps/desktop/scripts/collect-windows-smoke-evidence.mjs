/** Bounded, non-sensitive evidence from an installed Windows package smoke. */
import { execFile } from 'node:child_process'
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const execFileAsync = promisify(execFile)
const EVIDENCE_SCHEMA = 'open-dsh/windows-smoke-evidence/v1'

function evidenceCatalog(runnerTemp) {
  return [
    ['desktop-entry', join(runnerTemp, 'DeepSeek Harness AppData', 'desktop-entry.log')],
    ['harness-log', join(runnerTemp, 'DeepSeek Harness AppData', 'open-deepseek-harness-desktop', 'logs', 'harness.log')],
    ['data-home-setup', join(runnerTemp, 'DeepSeek Harness AppData', 'open-deepseek-harness-desktop', 'data-home-setup.json')],
    ['native-smoke-entry', join(runnerTemp, 'DeepSeek Harness Native Smoke AppData', 'desktop-entry.log')],
    ['profile-manifest', join(runnerTemp, 'DeepSeek Harness Home', 'profiles', 'web', 'package.json')],
    ['profile-lock', join(runnerTemp, 'DeepSeek Harness Home', 'profiles', 'web', 'pnpm-lock.yaml')],
  ]
}

function safeFileFailure(label, error) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (code === 'ENOENT') return { label, status: 'missing' }
  if (code === 'EACCES' || code === 'EPERM') return { label, status: 'unavailable', errorKind: 'unreadable' }
  if (code === 'ENAMETOOLONG') return { label, status: 'unavailable', errorKind: 'path-too-long' }
  return { label, status: 'unavailable', errorKind: 'io-error' }
}

async function probeFile(label, path) {
  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) return { label, status: 'unavailable', errorKind: 'unexpected-file-type' }
    return {
      label,
      status: 'present',
      length: metadata.size,
      modifiedAt: metadata.mtime.toISOString(),
    }
  } catch (error) {
    return safeFileFailure(label, error)
  }
}

function safeProcessEntry(value) {
  if (value === null || typeof value !== 'object') return undefined
  const processId = Number(value.ProcessId)
  const parentProcessId = Number(value.ParentProcessId)
  const name = typeof value.Name === 'string' ? value.Name.slice(0, 128) : ''
  if (!Number.isSafeInteger(processId) || processId < 0
    || !Number.isSafeInteger(parentProcessId) || parentProcessId < 0
    || name === '') return undefined
  return { processId, parentProcessId, name }
}

async function inspectWindowsProcesses(platform, environment) {
  if (platform !== 'win32') return { status: 'unsupported', entries: [] }
  const powershell = join(
    environment.SystemRoot ?? 'C:\\Windows',
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe',
  )
  const script = [
    "$items = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.Name -match 'DeepSeek|electron|node|Un_' } | Select-Object ProcessId, ParentProcessId, Name)",
    'ConvertTo-Json -InputObject $items -Compress',
  ].join('; ')
  try {
    const { stdout } = await execFileAsync(powershell, [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script,
    ], { windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 })
    const decoded = JSON.parse(stdout.trim() === '' ? '[]' : stdout)
    const entries = (Array.isArray(decoded) ? decoded : [decoded])
      .map(safeProcessEntry)
      .filter(entry => entry !== undefined)
      .sort((left, right) => left.processId - right.processId)
    return { status: 'collected', entries }
  } catch {
    return { status: 'degraded', errorKind: 'process-query-failed', entries: [] }
  }
}

async function writeEvidence(destination, evidence) {
  await mkdir(destination, { recursive: true })
  const target = join(destination, 'evidence.json')
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  try {
    await rename(temporary, target)
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code !== 'EEXIST' && code !== 'EPERM') throw error
    await rm(target, { force: true })
    await rename(temporary, target)
  } finally {
    await rm(temporary, { force: true })
  }
}

/** Collect safe package smoke evidence without reading diagnostic file contents.
 * @param {{ runnerTemp: string, destination: string, runId?: string, runAttempt?: string, platform?: NodeJS.Platform, environment?: NodeJS.ProcessEnv, now?: () => Date }} options
 * @returns {Promise<object>} the persisted evidence document.
 */
export async function collectWindowsSmokeEvidence(options) {
  const platform = options.platform ?? process.platform
  const environment = options.environment ?? process.env
  const files = await Promise.all(evidenceCatalog(options.runnerTemp)
    .map(async ([label, path]) => probeFile(label, path)))
  const processes = await inspectWindowsProcesses(platform, environment)
  const degraded = files.some(file => file.status === 'unavailable') || processes.status === 'degraded'
  const evidence = {
    schema: EVIDENCE_SCHEMA,
    status: degraded ? 'degraded' : 'complete',
    collectedAt: (options.now?.() ?? new Date()).toISOString(),
    run: {
      id: options.runId ?? '',
      attempt: options.runAttempt ?? '',
    },
    files,
    processes,
  }
  await writeEvidence(options.destination, evidence)
  return evidence
}

async function main() {
  const runnerTemp = process.env.RUNNER_TEMP
  if (runnerTemp === undefined || runnerTemp.trim() === '') {
    throw new Error('windows smoke evidence: RUNNER_TEMP is required')
  }
  const destination = resolve(import.meta.dirname, '../../../.artifacts/windows-smoke-evidence')
  const evidence = await collectWindowsSmokeEvidence({
    runnerTemp,
    destination,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  })
  console.log(`Collected Windows smoke evidence (${evidence.status}) at ${destination}`)
  if (evidence.status === 'degraded') console.warn('Windows smoke evidence collection was degraded; Package Qualification is unchanged.')
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
