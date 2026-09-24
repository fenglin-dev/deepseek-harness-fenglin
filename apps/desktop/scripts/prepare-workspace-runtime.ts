/** Assemble the target-specific Python runtime archive embedded in a desktop installer. */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import extractZip from 'extract-zip'
import { c, x } from 'tar'
import lock from './primary-runtime-lock.json' with { type: 'json' }
import { officialOfficeArtifact } from './official-office-runtime.ts'
import { curlProxyArguments } from './release-download-route.ts'

type LockTarget = keyof typeof lock.targets
type ReleaseTarget = 'win32-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64'

const TARGETS = {
  'win-x64': { release: 'win32-x64', platform: 'win32', arch: 'x64' },
  'mac-arm64': { release: 'darwin-arm64', platform: 'darwin', arch: 'arm64' },
  'mac-x64': { release: 'darwin-x64', platform: 'darwin', arch: 'x64' },
  'linux-x64': { release: 'linux-x64', platform: 'linux', arch: 'x64' },
} as const satisfies Record<LockTarget, { release: ReleaseTarget; platform: NodeJS.Platform; arch: string }>

function sha256(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex') }

async function download(url: string, expected: string, cache: string): Promise<string> {
  const destination = join(cache, expected)
  try {
    const bytes = readFileSync(destination)
    if (sha256(bytes) === expected) return destination
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  try {
    const args = ['--fail', '--silent', '--show-error', '--location', '--output', destination,
      ...curlProxyArguments(), url]
    execFileSync('curl', args, { stdio: 'inherit', timeout: 10 * 60_000 })
    const bytes = readFileSync(destination)
    if (sha256(bytes) !== expected) throw new Error(`workspace runtime: checksum mismatch for ${url}`)
    return destination
  } catch (error) {
    rmSync(destination, { force: true })
    throw new Error(`workspace runtime: download failed for ${url}`, { cause: error })
  }
}

function pythonArchive(target: LockTarget, cache: string): Promise<string> {
  const artifact = lock.targets[target]
  const filename = `cpython-${lock.pythonVersion}+${lock.pythonRelease}-${artifact.pythonTarget}-install_only_stripped.tar.gz`
  const url = `https://github.com/astral-sh/python-build-standalone/releases/download/${lock.pythonRelease}/${encodeURIComponent(filename)}`
  return download(url, artifact.pythonSha256, cache)
}

function payloadDigest(target: LockTarget): string {
  return sha256(JSON.stringify({
    format: 1,
    target,
    pythonVersion: lock.pythonVersion,
    pythonRelease: lock.pythonRelease,
    python: {
      target: lock.targets[target].pythonTarget,
      sha256: lock.targets[target].pythonSha256,
    },
    wheels: [...lock.targets[target].wheels, ...lock.wheels],
    pythonPackages: lock.pythonPackages,
  }))
}

async function unpackWheel(archive: string, destination: string): Promise<void> {
  await extractZip(archive, {
    dir: destination,
    onEntry(entry) {
      const [directory, scheme] = entry.fileName.split('/')
      if (directory?.endsWith('.data') && scheme !== '' && scheme !== 'scripts') {
        throw new Error(`workspace runtime: wheel uses unsupported installation path ${entry.fileName}`)
      }
    },
  })
}

function selectedTarget(): LockTarget {
  const value = process.argv[2]
  if (value === undefined || !(value in TARGETS)) {
    throw new Error(`usage: prepare-workspace-runtime.ts ${Object.keys(TARGETS).join('|')}`)
  }
  return value as LockTarget
}

/** Build one installer archive and its target-specific metadata. */
export async function prepareWorkspaceRuntime(target = selectedTarget()): Promise<void> {
  const identity = TARGETS[target]
  const root = resolve(import.meta.dirname, '../../..')
  const desktop = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string }
  const output = join(root, '.artifacts', 'workspace-runtime')
  const cache = join(root, '.artifacts', 'workspace-runtime-downloads')
  await Promise.all([mkdir(output, { recursive: true }), mkdir(cache, { recursive: true })])
  const staging = mkdtempSync(join(tmpdir(), 'dsh-workspace-runtime-'))
  try {
    const payload = join(staging, 'workspace-runtime')
    mkdirSync(payload)
    await x({ file: await pythonArchive(target, cache), cwd: payload, strict: true })
    const pythonRoot = join(payload, 'python')
    const sitePackages = identity.platform === 'win32'
      ? join(pythonRoot, 'Lib', 'site-packages')
      : join(pythonRoot, 'lib', `python${lock.pythonVersion.split('.').slice(0, 2).join('.')}`, 'site-packages')
    mkdirSync(sitePackages, { recursive: true })
    for (const wheel of [...lock.targets[target].wheels, ...lock.wheels]) {
      await unpackWheel(await download(wheel.url, wheel.sha256, cache), sitePackages)
    }
    const digest = payloadDigest(target)
    writeFileSync(join(payload, 'runtime.json'), `${JSON.stringify({
      schema: 'dsh/workspace-runtime-payload/v1',
      desktopVersion: desktop.version,
      platform: identity.platform,
      arch: identity.arch,
      payloadDigest: digest,
      pythonVersion: lock.pythonVersion,
      pythonPackages: lock.pythonPackages,
    }, undefined, 2)}\n`)
    const python = identity.platform === 'win32' ? join(pythonRoot, 'python.exe') : join(pythonRoot, 'bin', 'python3')
    if (identity.platform === process.platform && identity.arch === process.arch) {
      execFileSync(python, ['-I', '-B', '-c', 'import lxml, numpy, openpyxl, pandas, PIL, pptx, xlsxwriter, docx'], {
        stdio: 'inherit', timeout: 120_000,
      })
      execFileSync(python, ['-I', '-B', '-m', 'pip', 'check'], { stdio: 'inherit', timeout: 120_000 })
    }
    const fileName = `DeepSeek-Harness-workspace-runtime-${identity.release}.tar.gz`
    const archive = join(output, fileName)
    await c({ cwd: staging, file: archive, gzip: true, portable: true }, ['workspace-runtime'])
    const bytes = readFileSync(archive)
    const office = officialOfficeArtifact(identity, root, cache)
    const tag = `python-v${desktop.version}`
    const runtimeUrl = `https://github.com/hecoococ/open-dsh-runtime-assets/releases/download/${tag}/${fileName}`
    const fragment = {
      target: identity.release,
      fileName,
      size: statSync(archive).size,
      sha256: sha256(bytes),
      payloadDigest: digest,
      pythonVersion: lock.pythonVersion,
      githubUrl: runtimeUrl,
      cnbUrl: runtimeUrl,
      office,
    }
    writeFileSync(join(output, `workspace-runtime-${identity.release}.json`), `${JSON.stringify(fragment, undefined, 2)}\n`)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

if (import.meta.main) await prepareWorkspaceRuntime()
