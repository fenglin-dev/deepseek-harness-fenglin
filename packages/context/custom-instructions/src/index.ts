/** Global and Workspace-scoped user instructions injected into every matching Agent. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-workspace'
import type {
  CustomInstructionHistory,
  CustomInstructionSettings,
  CustomInstructionVersion,
} from './types.ts'
import {
  CUSTOM_INSTRUCTION_MAX_CHARS,
  CUSTOM_INSTRUCTIONS_SETTINGS_NAMESPACE,
} from './types.ts'

export type * from './types.ts'
export { CUSTOM_INSTRUCTION_MAX_CHARS, CUSTOM_INSTRUCTIONS_SETTINGS_NAMESPACE } from './types.ts'

/** Cordis plugin name. */
export const name = 'custom-instructions'

/** Services required to resolve settings and Workspace identity at Agent creation. */
export const inject = ['settings', 'systemPrompt', 'workspaceRegistry']

const VersionSchema: z<CustomInstructionVersion> = z.object({
  id: z.string().min(1).required(),
  text: z.string().max(CUSTOM_INSTRUCTION_MAX_CHARS).required(),
  createdAt: z.number().step(1).min(0).required(),
})

const HistorySchema: z<CustomInstructionHistory> = z.object({
  activeVersion: z.string().min(1),
  versions: z.array(VersionSchema).default([]),
})

/** Runtime schema for the settings document section. */
export const SettingsSchema: z<CustomInstructionSettings> = z.object({
  global: HistorySchema.default({ versions: [] }),
  workspaces: z.dict(HistorySchema).default({}),
  diagnosticExport: z.object({
    preference: z.union(['ask', 'include', 'exclude']).default('ask'),
  }).default({ preference: 'ask' }),
})

function activeVersion(history: CustomInstructionHistory | undefined): CustomInstructionVersion | undefined {
  if (history?.activeVersion === undefined) return undefined
  return history.versions.find(version => version.id === history.activeVersion)
}

/**
 * Render one saved revision with stable attribution for Session diagnostics.
 * @param scope - global or Workspace identity.
 * @param version - active immutable revision.
 * @returns model-visible text, or an empty contribution when disabled.
 */
export function renderCustomInstruction(
  scope: string,
  version: CustomInstructionVersion | undefined,
): string {
  if (version === undefined || version.text.trim().length === 0) return ''
  const scopeAttribute = scope === 'global' ? 'global' : `workspace:${scope}`
  return `<custom-instructions scope="${scopeAttribute}" version="${version.id}">\n${version.text}\n</custom-instructions>`
}

function workspaceIdOf(ctx: Context, agent: Agent): string | undefined {
  const cwd = agent.session.header.cwd
  if (cwd === undefined) return undefined
  return ctx.workspaceRegistry.list().find(workspace => workspace.path === cwd)?.id
}

/** Register live settings-backed prompt contexts for every Agent scope. */
export function apply(ctx: Context): void {
  const settings = ctx.settings.register(CUSTOM_INSTRUCTIONS_SETTINGS_NAMESPACE, SettingsSchema)

  ctx.on('agent/created', ({ agent }) => {
    const workspaceId = workspaceIdOf(ctx, agent)
    agent.ctx.systemPrompt.context({
      name: 'custom-instructions:global',
      order: 10_000,
      text: () => renderCustomInstruction('global', activeVersion(settings.get().global)),
    })
    if (workspaceId === undefined) return
    agent.ctx.systemPrompt.context({
      name: 'custom-instructions:workspace',
      order: 10_010,
      text: () => renderCustomInstruction(
        workspaceId,
        activeVersion(settings.get().workspaces[workspaceId]),
      ),
    })
  })
}
