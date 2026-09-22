/** Source-safe Agent Teams browser registration and Remote mount lifecycle. */

import type {
  TeamMemberView as TeamRosterMember,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import {
  TeamAction, type TeamActionInjected, type TeamActionResult, type TeamTaskActionResult,
} from './TeamAction.tsx'
import {
  AgentTeamComposerHint, AgentTeamUseAction, type AgentTeamOnboardingInjected,
} from './AgentTeamOnboarding.tsx'
import { en, NS, zh, type TeamKey } from './locales.ts'
import { AgentTeamOnboardingController } from './onboarding.ts'

const AGENT_TEAM_WEB_BUNDLE = '@deepseek-ai/dsh-experimental-agent-team-web-profile'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Agent Teams roster and task-board copy. */
    'agent-team': TeamKey
  }
}

/** Required browser services for RPC, navigation, slots, and localized copy. */
export const inject = ['sessions', 'uiWorkspace', 'conversation', 'remote', 'slots', 'locale']

function registerUi(ctx: ClientContext, onboarding: AgentTeamOnboardingController): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-agent-team: dictionaries')
  const t = ctx.locale.bind(NS)
  const sessions = ctx.sessions
  const leadSessionId = (sessionId: SessionId): SessionId => {
    const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
    return address?.parentSessionId ?? sessionId
  }

  const onboardingActions: AgentTeamOnboardingInjected = {
    hooks: { agentTeamOnboarding: onboarding.store },
    startUse(sessionId): void {
      onboarding.show(sessionId)
      ctx.uiWorkspace.openSession(sessionId)
    },
    fillPrompt(sessionId): void {
      const actx = ctx.sessions.scope(sessionId)
      if (actx === undefined) return
      const input = ctx.conversation.input.for(actx)
      if (input.state.getSnapshot().draft.trim() === '') input.setDraft(t('promptDraft'))
      input.focus()
      onboarding.dismiss(sessionId)
    },
    offerOnboarding: (sessionId, blank) => { onboarding.offer(sessionId, blank) },
    dismissOnboarding: (sessionId) => { onboarding.dismiss(sessionId) },
  }
  const actions: TeamActionInjected = {
    ...onboardingActions,
    async load(sessionId): Promise<TeamActionResult<TeamView>> {
      return await ctx.remote.agentTeams.view(leadSessionId(sessionId))
    },
    async createTask(sessionId, input): Promise<TeamTaskActionResult> {
      return await ctx.remote.agentTeams.createTask(leadSessionId(sessionId), input)
    },
    async updateTask(sessionId, input) {
      const { owner, ...rest } = input
      return await ctx.remote.agentTeams.updateTask(leadSessionId(sessionId), {
        ...rest,
        ...owner === undefined ? {} : { owner },
      })
    },
    async openTeammate(sessionId: SessionId, member: TeamRosterMember): Promise<void> {
      if (member.role !== 'teammate') return
      const parentSessionId = leadSessionId(sessionId)
      await sessions.refreshSubagents(parentSessionId)
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
      ctx.uiWorkspace.openSession({
        parentSessionId,
        childSessionId: member.id,
        mode: 'continuable',
      })
    },
  }

  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'agent-team',
      order: 20,
      locale: NS,
      inject: () => actions,
    }, TeamAction),
  )
  ctx.slots.inject(
    'conversation.composer.dock',
    () => ctx.slots.register({
      name: 'conversation.composer.dock',
      id: 'agent-team-onboarding',
      order: -20,
      locale: NS,
      inject: () => onboardingActions,
    }, AgentTeamComposerHint),
  )
  ctx.slots.inject(
    'plugins.bundle.action',
    () => ctx.slots.register({
      name: 'plugins.bundle.action',
      key: AGENT_TEAM_WEB_BUNDLE,
      locale: NS,
      inject: () => onboardingActions,
    }, AgentTeamUseAction),
  )
}

/**
 * Mount one generated Team Remote contribution, then register its browser UI.
 * @param ctx - Client Context carrying navigation, locale, slot, and Remote services.
 * @param contribution - generated Team descriptors selected by the browser entry.
 * @returns disposer for both the UI registrations and Remote namespace.
 */
export async function mountAgentTeamUi(
  ctx: ClientContext,
  contribution: TypertRemoteContribution,
): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(contribution)
  const onboarding = new AgentTeamOnboardingController()
  const ui = ctx.inject(
    ['sessions', 'uiWorkspace', 'conversation', 'remote.agentTeams', 'slots', 'locale'],
    (inner) => { registerUi(inner, onboarding) },
  )
  try {
    await ui
  } catch (error) {
    await ui.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await disposeRemote()
  }
}
