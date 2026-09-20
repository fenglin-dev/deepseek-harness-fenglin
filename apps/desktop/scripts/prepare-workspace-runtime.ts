/** Assemble a version-bound optional Python runtime archive without adding it to an installer. */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import extractZip from 'extract-zip'
import { c, x } from 'tar'
import lock from './primary-runtime-lock.json' with { type: 'json' }
import { selectOfficeEngine } from '../../../scripts/libreoffice-engine.ts'

type LockTarget = keyof typeof lock.targets
type ReleaseTarget = 'win32-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64'

const TARGETS = {
  'win-x64': { release: 'win32-x64', platform: 'win32', arch: 'x64' },
  'mac-arm64': { release: 'darwin-arm64', platform: 'darwin', arch: 'arm64' },
  'mac-x64': { release: 'darwin-x64', platform: 'darwin', arch: 'x64' },
  'linux-x64': { release: 'linux-x64', platform: 'linux', arch: 'x64' },
} as const satisfies Record<LockTarget, { release: ReleaseTarget; platform: NodeJS.Platform; arch: string }>

function sha256(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex') }

function proxyCandidates(): readonly (string | undefined)[] {
  return [process.env.HTTPS_PROXY, process.env.https_proxy, 'http://127.0.0.1:7890', undefined]
}

async function download(url: string, expected: string, cache: string): Promise<string> {
  const destination = join(cache, expected)
  try {
    const bytes = readFileSync(destination)
    if (sha256(bytes) === expected) return destination
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  let failure: unknown
  for (const proxy of proxyCandidates()) {
    try {
      const args = ['--fail', '--silent', '--show-error', '--location', '--output', destination]
      if (proxy !== undefined) args.push('--proxy', proxy)
      args.push(url)
      execFileSync('curl', args, { stdio: 'inherit', timeout: 10 * 60_000 })
      const bytes = readFileSync(destination)
      if (sha256(bytes) !== expected) throw new Error(`workspace runtime: checksum mismatch for ${url}`)
      return destination
    } catch (error) { failure = error; rmSync(destination, { force: true }) }
  }
  throw new Error(`workspace runtime: download failed for ${url}`, { cause: failure })
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

function officePayloadDigest(target: LockTarget, engine: { package: string; version: string }): string {
  return sha256(JSON.stringify({ format: 1, target, officeEngine: engine }))
}

function stageOfficeEngine(target: LockTarget, payload: string, root: string): { package: string; version: string } {
  const require = createRequire(join(root, 'package.json'))
  const kit = JSON.parse(readFileSync(require.resolve('@deepseek-ai/libreoffice-kit/package.json'), 'utf8')) as {
    version: string
    optionalDependencies?: Record<string, string>
  }
  const packageName = `@deepseek-ai/libreoffice-kit-${selectOfficeEngine(kit, TARGETS[target])}`
  const manifest = require.resolve(`${packageName}/package.json`)
  const destination = join(payload, 'office', 'node_modules', ...packageName.split('/'))
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(dirname(manifest), destination, { recursive: true, dereference: true })
  const staged = JSON.parse(readFileSync(join(destination, 'package.json'), 'utf8')) as { name?: string; version?: string }
  if (staged.name !== packageName || staged.version !== kit.version) {
    throw new Error(`workspace runtime: Office engine identity mismatch for ${packageName}`)
  }
  return { package: packageName, version: kit.version }
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

/** Build one release archive and its mergeable catalog fragment. */
export async function prepareWorkspaceRuntime(target = selectedTarget()): Promise<void> {
  const identity = TARGETS[target]
  const root = resolve(import.meta.dirname, '../../..')
  const desktop = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string }
  const output = join(root, '.artifacts', 'workspace-runtime')
  const cache = join(root, '.artifacts', 'workspace-runtime-downloads')
  await Promise.all([mkdir(output, { recursive: true }), mkdir(cache, { recursive: true })])
  const staging = mkdtempSync(join(tmpdir(), 'dsh-workspace-runtime-'))
  const officeStaging = mkdtempSync(join(tmpdir(), 'dsh-office-runtime-'))
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
    const officePayload = join(officeStaging, 'workspace-runtime')
    mkdirSync(officePayload)
    const officeEngine = stageOfficeEngine(target, officePayload, root)
    const officeDigest = officePayloadDigest(target, officeEngine)
    writeFileSync(join(officePayload, 'office-runtime.json'), `${JSON.stringify({
      schema: 'dsh/office-runtime-payload/v1',
      desktopVersion: desktop.version,
      platform: identity.platform,
      arch: identity.arch,
      payloadDigest: officeDigest,
      officeEngine,
    }, undefined, 2)}\n`)
    const officeFileName = `DeepSeek-Harness-office-runtime-${identity.release}.tar.gz`
    const officeArchive = join(output, officeFileName)
    await c({ cwd: officeStaging, file: officeArchive, gzip: true, portable: true }, ['workspace-runtime'])
    const officeBytes = readFileSync(officeArchive)
    const tag = `odsh-v${desktop.version}`
    const fragment = {
      target: identity.release,
      fileName,
      size: statSync(archive).size,
      sha256: sha256(bytes),
      payloadDigest: digest,
      pythonVersion: lock.pythonVersion,
      githubUrl: `https://github.com/flaqai/open-deepseek-harness-desktop/releases/download/${tag}/${fileName}`,
      cnbUrl: `https://cnb.cool/hecoococ/open-deepseek-harness-desktop/-/releases/download/${tag}/${fileName}`,
      office: {
        fileName: officeFileName,
        size: statSync(officeArchive).size,
        sha256: sha256(officeBytes),
        payloadDigest: officeDigest,
        enginePackage: officeEngine.package,
        engineVersion: officeEngine.version,
        githubUrl: `https://github.com/flaqai/open-deepseek-harness-desktop/releases/download/${tag}/${officeFileName}`,
        cnbUrl: `https://cnb.cool/hecoococ/open-deepseek-harness-desktop/-/releases/download/${tag}/${officeFileName}`,
      },
    }
    writeFileSync(join(output, `workspace-runtime-${identity.release}.json`), `${JSON.stringify(fragment, undefined, 2)}\n`)
  } finally {
    rmSync(staging, { recursive: true, force: true })
    rmSync(officeStaging, { recursive: true, force: true })
  }
}

if (import.meta.main) await prepareWorkspaceRuntime()
