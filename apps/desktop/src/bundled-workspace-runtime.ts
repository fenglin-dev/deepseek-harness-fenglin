/** Target-specific workspace-runtime metadata installed with the desktop application. */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  parseWorkspaceRuntimeArtifact,
  type WorkspaceRuntimeManifest,
  type WorkspaceRuntimeTarget,
} from './workspace-runtime-manifest.ts'

/** Load the one native Python artifact included by the current platform package. */
export async function loadBundledWorkspaceRuntimeManifest(
  directory: string,
  target: WorkspaceRuntimeTarget,
  desktopVersion: string,
): Promise<WorkspaceRuntimeManifest> {
  const value: unknown = JSON.parse(await readFile(join(directory, `workspace-runtime-${target}.json`), 'utf8'))
  const artifact = parseWorkspaceRuntimeArtifact(value, target)
  return {
    schema: 'dsh/desktop-workspace-runtimes/v2',
    desktopVersion,
    issuedAt: '2020-01-01T00:00:00.000Z',
    expiresAt: '2100-01-01T00:00:00.000Z',
    artifacts: { [target]: artifact } as Readonly<Record<WorkspaceRuntimeTarget, typeof artifact>>,
  }
}
