/** Derive a signed-catalog subject from already-built release archives. */

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { x } from 'tar'
import { parseWorkspaceRuntimeManifest, WORKSPACE_RUNTIME_TARGETS } from '../src/workspace-runtime-manifest.ts'
import { officialOfficeArtifact, type OfficialOfficeTarget } from './official-office-runtime.ts'

const directory = resolve(process.argv[2] ?? '')
const tag = process.argv[3] ?? ''
const sourceSha = process.argv[4] ?? ''
if (!/^odsh-v[0-9A-Za-z.+-]+$/u.test(tag)) throw new Error('workspace runtime: expected an odsh-v* release tag')
if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error('workspace runtime: expected a full release source SHA')
const version = tag.slice('odsh-v'.length)
const root = resolve(import.meta.dirname, '../../..')
const cache = join(directory, '.office-downloads')
const artifacts: Record<string, unknown> = {}
for (const target of WORKSPACE_RUNTIME_TARGETS) {
  const fileName = `DeepSeek-Harness-workspace-runtime-${target}.tar.gz`
  const archive = join(directory, fileName)
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
    const bytes = await readFile(archive)
    const [platform, arch] = target.split('-')
    const office = officialOfficeArtifact({
      release: target,
      platform: platform as NodeJS.Platform,
      arch: arch as string,
    } satisfies OfficialOfficeTarget, root, cache)
    const runtimeTag = `python-v${version}`
    const runtimeUrl = `https://github.com/hecoococ/open-dsh-runtime-assets/releases/download/${runtimeTag}/${fileName}`
    artifacts[target] = {
      target, fileName, size: (await stat(archive)).size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      payloadDigest: payload.payloadDigest,
      pythonVersion: payload.pythonVersion,
      githubUrl: runtimeUrl,
      cnbUrl: runtimeUrl,
      office,
    }
  } finally { await rm(staging, { recursive: true, force: true }) }
}
const issuedAt = new Date().toISOString()
const manifest = parseWorkspaceRuntimeManifest({
  schema: 'dsh/desktop-workspace-runtimes/v2', desktopVersion: version, issuedAt,
  expiresAt: new Date(Date.parse(issuedAt) + 180 * 24 * 60 * 60_000).toISOString(), artifacts,
})
await writeFile(join(directory, `workspace-runtimes-${version}.v2.json`), `${JSON.stringify({ ...manifest, sourceSha }, undefined, 2)}\n`)
