/** Desktop-owned compatibility resolution for official external-tool connectors. */

import type { PluginInstallRequest } from '@deepseek-ai/dsh-host-plugin-inventory/types'

/** Official external-tool connectors the reviewed Desktop manifest may install. */
export type InstallableExternalToolId = 'codex' | 'claude-code'

interface DesktopExternalToolsBridge {
  resolve(toolId: InstallableExternalToolId): Promise<{
    readonly toolId: InstallableExternalToolId
    readonly packageSpec: string
  }>
}

/** Exact non-desktop fallback checked against the desktop source manifest by the release gate. */
export const BROWSER_FALLBACK_EXTERNAL_TOOL_SPECS: Readonly<Record<InstallableExternalToolId, string>> = {
  codex: '@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.5',
  'claude-code': '@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.5',
}

function readDesktopExternalToolsBridge(): DesktopExternalToolsBridge | undefined {
  const desktop = (globalThis as typeof globalThis & { deepSeekHarnessDesktop?: unknown }).deepSeekHarnessDesktop
  if (desktop === null || typeof desktop !== 'object') return undefined
  const externalTools = (desktop as { externalTools?: unknown }).externalTools
  if (externalTools === null || typeof externalTools !== 'object') return undefined
  const candidate = externalTools as Partial<DesktopExternalToolsBridge>
  return typeof candidate.resolve === 'function' ? candidate as DesktopExternalToolsBridge : undefined
}

/**
 * Resolve a closed tool id; desktop clients never submit package coordinates to main.
 * @param toolId - Reviewed connector identity selected by the renderer.
 * @returns Fixed Web Profile install request from Desktop authority or the embedded fallback.
 */
export async function resolveExternalToolInstallRequest(
  toolId: InstallableExternalToolId,
): Promise<PluginInstallRequest> {
  const resolution = await readDesktopExternalToolsBridge()?.resolve(toolId)
  return {
    profile: 'web',
    packageSpec: resolution?.packageSpec ?? BROWSER_FALLBACK_EXTERNAL_TOOL_SPECS[toolId],
  }
}
