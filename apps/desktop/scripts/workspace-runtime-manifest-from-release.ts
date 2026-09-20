/** Derive a signed-catalog subject from already-built release archives. */

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { x } from 'tar'
import { parseWorkspaceRuntimeManifest, WORKSPACE_RUNTIME_TARGETS } from '../src/workspace-runtime-manifest.ts'

const directory = resolve(process.argv[2] ?? '')
const tag = process.argv[3] ?? ''
if (!/^odsh-v[0-9A-Za-z.+-]+$/u.test(tag)) throw new Error('workspace runtime: expected an odsh-v* release tag')
const version = tag.slice('odsh-v'.length)
const artifacts: Record<string, unknown> = {}
for (const target of WORKSPACE_RUNTIME_TARGETS) {
  const fileName = `DeepSeek-Harness-workspace-runtime-${target}.tar.gz`
  const archive = join(directory, fileName)
  const officeFileName = `DeepSeek-Harness-office-runtime-${target}.tar.gz`
  const officeArchive = join(directory, officeFileName)
  const staging = await mkdtemp(join(tmpdir(), 'dsh-runtime-manifest-'))
  try {
    await x({ file: archive, cwd: staging, strict: true })
    const payload = JSON.parse(await readFile(join(staging, 'workspace-runtime', 'runtime.json'), 'utf8')) as {
      desktopVersion?: unknown
      payloadDigest?: unknown
      pythonVersion?: unknown
    }
    if (payload.desktopVersion !== version || typeof payload.payloadDigest !== 'string' || typeof payload.pythonVersion !== 'string') {
      throw new Error(`workspace runtime: ${fileName} has incompatible payload metadata`)
    }
    const officeStaging = await mkdtemp(join(tmpdir(), 'dsh-office-runtime-manifest-'))
    const bytes = await readFile(archive)
    const officeBytes = await readFile(officeArchive)
    let office: Record<string, unknown>
    try {
      await x({ file: officeArchive, cwd: officeStaging, strict: true })
      const metadata = JSON.parse(await readFile(join(officeStaging, 'workspace-runtime', 'office-runtime.json'), 'utf8')) as {
        desktopVersion?: unknown
        payloadDigest?: unknown
        officeEngine?: { package?: unknown; version?: unknown }
      }
      if (metadata.desktopVersion !== version || typeof metadata.payloadDigest !== 'string'
        || typeof metadata.officeEngine?.package !== 'string' || typeof metadata.officeEngine.version !== 'string') {
        throw new Error(`workspace runtime: ${officeFileName} has incompatible payload metadata`)
      }
      office = {
        fileName: officeFileName,
        size: (await stat(officeArchive)).size,
        sha256: createHash('sha256').update(officeBytes).digest('hex'),
        payloadDigest: metadata.payloadDigest,
        enginePackage: metadata.officeEngine.package,
        engineVersion: metadata.officeEngine.version,
        githubUrl: `https://github.com/flaqai/open-deepseek-harness-desktop/releases/download/${tag}/${officeFileName}`,
        cnbUrl: `https://cnb.cool/hecoococ/open-deepseek-harness-desktop/-/releases/download/${tag}/${officeFileName}`,
      }
    } finally { await rm(officeStaging, { recursive: true, force: true }) }
    artifacts[target] = {
      target, fileName, size: (await stat(archive)).size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      payloadDigest: payload.payloadDigest,
      pythonVersion: payload.pythonVersion,
      githubUrl: `https://github.com/flaqai/open-deepseek-harness-desktop/releases/download/${tag}/${fileName}`,
      cnbUrl: `https://cnb.cool/hecoococ/open-deepseek-harness-desktop/-/releases/download/${tag}/${fileName}`,
      office,
    }
  } finally { await rm(staging, { recursive: true, force: true }) }
}
const issuedAt = new Date().toISOString()
const manifest = parseWorkspaceRuntimeManifest({
  schema: 'dsh/desktop-workspace-runtimes/v1', desktopVersion: version, issuedAt,
  expiresAt: new Date(Date.parse(issuedAt) + 180 * 24 * 60 * 60_000).toISOString(), artifacts,
})
await writeFile(join(directory, `workspace-runtimes-${version}.v1.json`), `${JSON.stringify(manifest, undefined, 2)}\n`)
