/** Resolve registry-backed desktop presets once and materialize an offline archive set. */

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rename, rm, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import {
  assertBundledPluginManifestEntry,
  type BundledPluginManifestEntry,
} from '../src/bundled-plugin-seed.ts'

const NPM_REGISTRY = 'https://registry.npmjs.org'

interface BundledPluginManifest {
  readonly schema: 2
  readonly plugins: readonly BundledPluginManifestEntry[]
}

/** Registry metadata returned by `pnpm view <package>@latest`. */
export interface LatestPluginMetadata {
  readonly name: string
  readonly version: string
  readonly tarball: string
  readonly integrity: string
}

/** Dependencies used by refresh tests and the network-backed CLI. */
export interface BundledPluginRefreshDependencies {
  readonly queryLatest: (packageName: string) => Promise<LatestPluginMetadata>
  readonly download: (url: string) => Promise<Buffer>
}

function archiveStem(packageName: string): string {
  return packageName.replace(/^@/u, '').replaceAll('/', '-')
}

function isStableVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/u.test(version)
}

function isRegistryTracked(entry: BundledPluginManifestEntry): boolean {
  // Local-only and Git archives keep their checked tarball; only `name@version`
  // specs are treated as live npm dist-tags.
  if (entry.registrySpec === undefined) return false
  if (entry.registrySpec.startsWith('file:') || entry.registrySpec.startsWith('github:')) return false
  return entry.registrySpec === `${entry.packageName}@${entry.version}`
}

function integrityFor(bytes: Buffer): string {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

function assertLatestMetadata(packageName: string, metadata: LatestPluginMetadata): void {
  let tarball: URL
  try {
    tarball = new URL(metadata.tarball)
  } catch {
    throw new Error(`bundled-plugin refresh: ${packageName} returned an invalid tarball URL`)
  }
  if (metadata.name !== packageName
    || !isStableVersion(metadata.version)
    || tarball.protocol !== 'https:'
    || tarball.hostname !== 'registry.npmjs.org'
    || !metadata.integrity.startsWith('sha512-')) {
    throw new Error(`bundled-plugin refresh: ${packageName}@latest returned invalid stable metadata`)
  }
}

function parseManifest(source: string): BundledPluginManifest {
  const value = JSON.parse(source) as { schema?: unknown; plugins?: unknown }
  if (value.schema !== 2 || !Array.isArray(value.plugins)) {
    throw new Error('bundled-plugin refresh: unsupported manifest')
  }
  for (const entry of value.plugins) assertBundledPluginManifestEntry(entry)
  return { schema: 2, plugins: value.plugins }
}

/** Verify that every manifest entry has its exact checked archive.
 * @param directory - bundled plugin snapshot directory.
 * @returns the parsed manifest.
 */
export async function verifyBundledPluginSnapshot(directory: string): Promise<BundledPluginManifest> {
  const manifest = parseManifest(await readFile(join(directory, 'manifest.json'), 'utf8'))
  for (const entry of manifest.plugins) {
    const bytes = await readFile(join(directory, entry.archive))
    if (integrityFor(bytes) !== entry.integrity) {
      throw new Error(`bundled-plugin refresh: integrity mismatch for ${entry.packageName}`)
    }
  }
  return manifest
}

/** Replace registry-backed entries with pnpm's latest stable dist-tag and retain fixed Git entries.
 * @param directory - checked desktop bundled-plugin directory to replace atomically.
 * @param dependencies - registry lookup and archive download operations.
 * @returns the resolved manifest written to the snapshot.
 */
export async function refreshBundledPluginSnapshot(
  directory: string,
  dependencies: BundledPluginRefreshDependencies,
): Promise<BundledPluginManifest> {
  const current = await verifyBundledPluginSnapshot(directory)
  const staging = await mkdtemp(join(dirname(directory), '.bundled-plugins-refresh-'))
  const backup = `${directory}.backup-${process.pid}-${Date.now()}`
  try {
    const plugins: BundledPluginManifestEntry[] = []
    for (const entry of current.plugins) {
      if (!isRegistryTracked(entry)) {
        await copyFile(join(directory, entry.archive), join(staging, entry.archive))
        plugins.push(entry)
        continue
      }
      let metadata: LatestPluginMetadata
      try {
        metadata = await dependencies.queryLatest(entry.packageName)
      } catch (error) {
        // Fenglin-local archives and transient registry gaps keep the verified tarball.
        const reason = error instanceof Error ? error.message : String(error)
        console.warn(`bundled-plugin refresh: keeping ${entry.packageName}@${entry.version} (${reason})`)
        await copyFile(join(directory, entry.archive), join(staging, entry.archive))
        plugins.push(entry)
        continue
      }
      assertLatestMetadata(entry.packageName, metadata)
      const bytes = await dependencies.download(metadata.tarball)
      if (integrityFor(bytes) !== metadata.integrity) {
        throw new Error(`bundled-plugin refresh: downloaded integrity mismatch for ${entry.packageName}`)
      }
      const archive = `${archiveStem(entry.packageName)}-${metadata.version}.tgz`
      await writeFile(join(staging, archive), bytes)
      plugins.push({
        ...entry,
        version: metadata.version,
        registrySpec: `${entry.packageName}@${metadata.version}`,
        archive,
        integrity: metadata.integrity,
      })
    }
    const manifest: BundledPluginManifest = { schema: 2, plugins }
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await verifyBundledPluginSnapshot(staging)
    await rename(directory, backup)
    try {
      await rename(staging, directory)
    } catch (error) {
      await rename(backup, directory)
      throw error
    }
    await rm(backup, { recursive: true, force: true })
    return manifest
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

function runPnpmView(packageName: string, repositoryRoot: string): Promise<LatestPluginMetadata> {
  return new Promise((resolvePromise, reject) => {
    const args = [
      `--registry=${NPM_REGISTRY}`,
      'view', `${packageName}@latest`, 'name', 'version', 'dist.tarball', 'dist.integrity', '--json',
    ]
    const pnpmEntry = process.env.npm_execpath
    const child = pnpmEntry?.includes('pnpm') === true
      ? spawn(process.execPath, [pnpmEntry, ...args], {
        cwd: repositoryRoot,
        env: { ...process.env, npm_config_cache: join(repositoryRoot, '.artifacts', 'npm-cache') },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      : spawn('pnpm', args, {
        cwd: repositoryRoot,
        env: { ...process.env, npm_config_cache: join(repositoryRoot, '.artifacts', 'npm-cache') },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`bundled-plugin refresh: pnpm view failed for ${packageName}: ${stderr.trim()}`))
        return
      }
      try {
        const value = JSON.parse(stdout) as Record<string, unknown>
        resolvePromise({
          name: String(value.name ?? ''),
          version: String(value.version ?? ''),
          tarball: String(value['dist.tarball'] ?? ''),
          integrity: String(value['dist.integrity'] ?? ''),
        })
      } catch (error) {
        reject(new Error(`bundled-plugin refresh: invalid pnpm JSON for ${packageName}`, { cause: error }))
      }
    })
  })
}

async function downloadArchive(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`bundled-plugin refresh: ${url} returned HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main(): Promise<void> {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const repositoryRoot = resolve(desktopRoot, '../..')
  const directory = join(desktopRoot, 'bundled-plugins')
  const { values } = parseArgs({
    options: { 'if-enabled': { type: 'boolean', default: false } },
    allowPositionals: false,
  })
  if (values['if-enabled'] && process.env.DSH_BUNDLED_PLUGINS_REFRESH === '0') {
    const manifest = await verifyBundledPluginSnapshot(directory)
    console.log(`bundled-plugin refresh: using resolved offline snapshot with ${manifest.plugins.length} plugin(s)`)
    return
  }
  const manifest = await refreshBundledPluginSnapshot(directory, {
    queryLatest: packageName => runPnpmView(packageName, repositoryRoot),
    download: downloadArchive,
  })
  console.log(`bundled-plugin refresh: resolved ${manifest.plugins.length} offline plugin archive(s)`)
}

const invoked = process.argv[1] !== undefined
  && (import.meta.url === pathToFileURL(process.argv[1]).href
    || import.meta.url.endsWith('/refresh-bundled-plugins.ts')
    || import.meta.url.endsWith('\\refresh-bundled-plugins.ts'))
if (invoked || process.argv.includes('--if-enabled')) {
  try {
    await main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`bundled-plugin refresh failed: ${message}`)
    if (error instanceof Error && error.stack) console.error(error.stack)
    process.exitCode = 1
  }
}
