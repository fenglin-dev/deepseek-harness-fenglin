/** Release gate for exact external-tool provider and platform runtime coordinates. */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  EMBEDDED_EXTERNAL_TOOL_COMPATIBILITY,
  EXTERNAL_TOOL_IDS,
  parseExternalToolCompatibilityManifest,
  type ExternalToolRuntimePackage,
} from '../src/external-tool-compatibility-manifest.ts'
import { BROWSER_FALLBACK_EXTERNAL_TOOL_SPECS } from '../../../packages/client/ui-settings-plugin-inventory/src/client/external-tool-compatibility-bridge.ts'

interface RegistryVersion {
  readonly name?: unknown
  readonly version?: unknown
  readonly dist?: { readonly integrity?: unknown }
  readonly dependencies?: Readonly<Record<string, string>>
  readonly optionalDependencies?: Readonly<Record<string, string>>
}

interface RegistryPackument {
  readonly versions?: Readonly<Record<string, RegistryVersion>>
}

const REGISTRY = process.env.npm_config_registry ?? 'https://registry.npmjs.org'

async function fetchVersion(packageName: string, version: string): Promise<RegistryVersion> {
  const url = `${REGISTRY.replace(/\/$/u, '')}/${encodeURIComponent(packageName)}`
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`external-tool gate: ${packageName} returned HTTP ${response.status}`)
  const packument = await response.json() as RegistryPackument
  const metadata = packument.versions?.[version]
  if (metadata === undefined) throw new Error(`external-tool gate: ${packageName}@${version} is not published`)
  return metadata
}

function assertIntegrity(metadata: RegistryVersion, packageName: string, version: string, expected?: string): void {
  const actual = metadata.dist?.integrity
  if (typeof actual !== 'string' || !actual.startsWith('sha512-')) {
    throw new Error(`external-tool gate: ${packageName}@${version} has no SHA-512 registry integrity`)
  }
  if (expected !== undefined && actual !== expected) {
    throw new Error(`external-tool gate: ${packageName}@${version} integrity drifted from the reviewed pin`)
  }
}

function parseOptionalCoordinate(dependencyName: string, spec: string): { packageName: string; version: string } {
  const alias = /^npm:(@[^/]+\/[^@]+|[^@]+)@(.+)$/u.exec(spec)
  if (alias !== null) return { packageName: alias[1]!, version: alias[2]! }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(spec)) {
    throw new Error(`external-tool gate: ${dependencyName} platform coordinate is not exact: ${spec}`)
  }
  return { packageName: dependencyName, version: spec }
}

async function verifyRuntime(runtime: ExternalToolRuntimePackage): Promise<void> {
  const metadata = await fetchVersion(runtime.packageName, runtime.version)
  assertIntegrity(metadata, runtime.packageName, runtime.version, runtime.integrity)
  const optional = metadata.optionalDependencies ?? {}
  if (runtime.verifyOptionalPlatformPackages && Object.keys(optional).length === 0) {
    throw new Error(`external-tool gate: ${runtime.packageName}@${runtime.version} declares no platform packages`)
  }
  await Promise.all(Object.entries(optional).map(async ([dependencyName, spec]) => {
    const coordinate = parseOptionalCoordinate(dependencyName, spec)
    const platformMetadata = await fetchVersion(coordinate.packageName, coordinate.version)
    assertIntegrity(platformMetadata, coordinate.packageName, coordinate.version)
  }))
}

const manifestPath = resolve('apps/desktop/external-tools/compatibility.v1.json')
const manifest = parseExternalToolCompatibilityManifest(
  JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
)
assert.deepEqual(manifest, EMBEDDED_EXTERNAL_TOOL_COMPATIBILITY, 'embedded pins must exactly match the signed source manifest')

for (const toolId of EXTERNAL_TOOL_IDS) {
  const coordinate = manifest.tools[toolId]
  const provider = JSON.parse(await readFile(
    resolve(`packages/subagent/subagent-${toolId}/package.json`), 'utf8',
  )) as { name: string; version: string; dependencies: Record<string, string> }
  assert.equal(coordinate.packageName, provider.name, 'external-tool gate: provider identity drifted')
  assert.equal(
    manifest.reviewedSourceVersion, provider.version,
    `external-tool gate: ${toolId} compatibility review must be renewed for the current source baseline`,
  )
  assert.equal(
    coordinate.runtimePackage.version, provider.dependencies[coordinate.runtimePackage.packageName],
    `external-tool gate: ${toolId} reviewed runtime must match the current source baseline`,
  )
  assert.equal(
    BROWSER_FALLBACK_EXTERNAL_TOOL_SPECS[toolId],
    `${coordinate.packageName}@${coordinate.version}`,
    `external-tool gate: ${toolId} browser fallback drifted from the reviewed pin`,
  )
  const metadata = await fetchVersion(coordinate.packageName, coordinate.version)
  assertIntegrity(metadata, coordinate.packageName, coordinate.version, coordinate.integrity)
  assert.equal(
    metadata.dependencies?.[coordinate.runtimePackage.packageName],
    coordinate.runtimePackage.version,
    `external-tool gate: ${coordinate.packageName} must depend on the reviewed runtime version`,
  )
  await verifyRuntime(coordinate.runtimePackage)
  console.log(`verified ${toolId}: ${coordinate.packageName}@${coordinate.version}`)
}
