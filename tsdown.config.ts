import { defineConfig } from 'tsdown'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { typertPlugin } from './packages/typert/generator/lib/types/tsdown-plugin.js'
import { workspaceBuildPackages } from './scripts/workspace-build-packages.ts'

const root = dirname(fileURLToPath(import.meta.url))

function isBuildFaceClient(value: unknown): boolean {
  if (value === undefined || value === 'host') return false
  if (value === 'client') return true
  throw new Error(`tsdown: --env.DSH_BUILD_FACE must be host or client, received ${String(value)}`)
}

/**
 * The ordinary workspace build bundles TypeScript sources and runs Typert. The Client pass selects packages that
 * declare a browser bundle and lets their package-local configs emit both
 * their Node loader entry and browser artifact.
 */
export default defineConfig(({ env }) => {
  const client = isBuildFaceClient(env?.DSH_BUILD_FACE)
  return {
    workspace: workspaceBuildPackages(root, client
      ? ['vendor/*', 'packages/*/*', 'apps/cli']
      : ['vendor/*', 'packages/*/*', 'apps/cli', 'apps/desktop-host']),
    entry: client ? '' : ['src/{index,invariant,startup}.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    plugins: client ? [] : [typertPlugin({ mode: 'workspace', faces: ['host'] })],
  }
})
