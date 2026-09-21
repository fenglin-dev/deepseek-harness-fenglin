/** Merge native optional-runtime fragments into the signed catalog document. */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseWorkspaceRuntimeManifest, WORKSPACE_RUNTIME_TARGETS } from '../src/workspace-runtime-manifest.ts'

const root = resolve(import.meta.dirname, '../../..')
const source = process.argv[2] === undefined ? join(root, '.artifacts', 'workspace-runtime') : resolve(process.argv[2])
const output = process.argv[3] === undefined ? source : resolve(process.argv[3])
const desktop = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string }
const artifacts = Object.fromEntries(await Promise.all(WORKSPACE_RUNTIME_TARGETS.map(async target => [
  target,
  JSON.parse(await readFile(join(source, `workspace-runtime-${target}.json`), 'utf8')) as unknown,
])))
const issuedAt = new Date().toISOString()
const manifest = parseWorkspaceRuntimeManifest({
  schema: 'dsh/desktop-workspace-runtimes/v2',
  desktopVersion: desktop.version,
  issuedAt,
  expiresAt: new Date(Date.parse(issuedAt) + 180 * 24 * 60 * 60_000).toISOString(),
  artifacts,
})
await mkdir(output, { recursive: true })
await writeFile(join(output, `workspace-runtimes-${desktop.version}.v2.json`), `${JSON.stringify(manifest, undefined, 2)}\n`)
