/** Desktop-owned Profile composition for optional workspace runtime capabilities. */

import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseDocument } from 'yaml'

export type WorkspaceRuntimeCapability = 'office' | 'ptc'

export interface WorkspaceRuntimeProfilePaths {
  readonly runtimeRoot: string
  readonly python: string
  readonly node: string
  readonly pnpm: string
  readonly nodePackages: string
  readonly customPython?: {
    readonly executable: string
    readonly sitePackages: string
    readonly distributions: Readonly<Record<string, string>>
  }
}

function markers(capability: WorkspaceRuntimeCapability): readonly [string, string] {
  return [`# BEGIN community-desktop:workspace-runtime:${capability}`, `# END community-desktop:workspace-runtime:${capability}`]
}

function block(capability: WorkspaceRuntimeCapability, paths: WorkspaceRuntimeProfilePaths): string {
  const [start, end] = markers(capability)
  const rows = capability === 'office'
    ? [
      '- insert:',
      '    - id: community-desktop.workspace-runtime.office',
      "      name: '@deepseek-ai/dsh-host-workspace-runtime'",
      '      config:',
      `        runtimeRoot: ${JSON.stringify(paths.runtimeRoot)}`,
      `        node: ${JSON.stringify(paths.node)}`,
      `        pnpm: ${JSON.stringify(paths.pnpm)}`,
      `        nodePackages: ${JSON.stringify(paths.nodePackages)}`,
      ...(paths.customPython === undefined ? [] : [
        `        python: ${JSON.stringify(paths.customPython.executable)}`,
        `        pythonPackages: ${JSON.stringify(paths.customPython.sitePackages)}`,
        `        pythonDistributions: ${JSON.stringify(paths.customPython.distributions)}`,
      ]),
      '        office: true',
    ]
    : [
      '- insert:',
      '    - id: community-desktop.workspace-runtime.ptc',
      "      name: '@deepseek-ai/dsh-experimental-ptc-runtime-python'",
      '      config:',
      `        pythonBin: ${JSON.stringify(paths.customPython?.executable ?? paths.python)}`,
    ]
  return `${start}\n${rows.join('\n')}\n${end}`
}

function replaceBlock(
  text: string,
  capability: WorkspaceRuntimeCapability,
  next: string | undefined,
): string {
  const [start, end] = markers(capability)
  const startIndex = text.indexOf(start)
  const endIndex = text.indexOf(end)
  if ((startIndex < 0) !== (endIndex < 0) || (startIndex >= 0 && endIndex < startIndex)) {
    throw new Error(`desktop: malformed managed ${capability} workspace-runtime block`)
  }
  if (startIndex < 0) {
    if (next === undefined) return text
    const base = text.replace(/(?:^|\n)\s*\[\]\s*$/u, '').trimEnd()
    return `${base}${base === '' ? '' : '\n\n'}${next}\n`
  }
  const suffix = text.slice(endIndex + end.length)
  if (next === undefined) {
    return `${text.slice(0, startIndex).trimEnd()}${suffix}`.replace(/^\s*$/u, '[]\n')
  }
  return `${text.slice(0, startIndex)}${next}${suffix}`
}

function validatePatch(text: string): void {
  const parsed = parseDocument(text)
  if (parsed.errors.length > 0) throw new Error(`desktop: invalid managed workspace-runtime patch: ${parsed.errors[0]?.message ?? 'unknown YAML error'}`)
  if (!Array.isArray(parsed.toJS())) throw new Error('desktop: managed workspace-runtime patch must remain a YAML sequence')
}

function atomicWrite(filename: string, content: string): void {
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
  const temporary = `${filename}.${randomUUID()}.tmp`
  const descriptor = openSync(temporary, 'wx', 0o600)
  let open = true
  try {
    writeFileSync(descriptor, content)
    fsyncSync(descriptor)
    closeSync(descriptor)
    open = false
    renameSync(temporary, filename)
  } catch (error) {
    if (open) closeSync(descriptor)
    rmSync(temporary, { force: true })
    throw error
  }
}

/**
 * Change only the selected managed block while preserving user YAML and other capabilities.
 * @param home - Candidate Harness home owned by the Desktop Profile transaction.
 * @param capability - Closed capability identity.
 * @param enabled - Whether the block should be present after the mutation.
 * @param paths - Trusted application paths used only when enabling the block.
 * @returns Whether the patch file changed.
 */
export function configureWorkspaceRuntimeCapability(
  home: string,
  capability: WorkspaceRuntimeCapability,
  enabled: boolean,
  paths: WorkspaceRuntimeProfilePaths,
): boolean {
  const filename = join(home, 'profiles', 'web', 'cordis.patch.yml')
  const before = existsSync(filename) ? readFileSync(filename, 'utf8') : '[]\n'
  validatePatch(before)
  const after = replaceBlock(before, capability, enabled ? block(capability, paths) : undefined)
  validatePatch(after)
  if (after === before) return false
  atomicWrite(filename, after)
  return true
}
