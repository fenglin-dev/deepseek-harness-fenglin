/** Agent Teams discovery controls shared by the Plugins page and composer. */

import type { ReactNode } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Button, IconCloseOutline16, IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { NS } from './locales.ts'
import type { AgentTeamOnboardingState } from './onboarding.ts'
import css from './AgentTeamOnboarding.module.css'

/** Shared business face injected into every Agent Teams onboarding surface. */
export interface AgentTeamOnboardingInjected {
  hooks: { agentTeamOnboarding: SnapshotStore<AgentTeamOnboardingState> }
  startUse: (sessionId: SessionId) => void
  fillPrompt: (sessionId: SessionId) => void
  offerOnboarding: (sessionId: SessionId, blank: boolean) => void
  dismissOnboarding: (sessionId: SessionId) => void
}

/** Most recently updated ordinary conversation with at least one durable event. */
export function recentNonblankSession(state: SessionListState): SessionId | undefined {
  let selected: { id: SessionId; updatedAt: number } | undefined
  for (const id of state.ids) {
    const session = state.byId[id]
    if (session === undefined || session.blank || session.origin === 'subagent') continue
    if (selected === undefined || session.updatedAt > selected.updatedAt) {
      selected = { id: session.id, updatedAt: session.updatedAt }
    }
  }
  return selected?.id
}

type UseActionProps =
  PropsRuntime<'plugins.bundle.action'>
  & PropsLocale<typeof NS>
  & InjectFace<Pick<AgentTeamOnboardingInjected, 'startUse'>>

/** Plugins-page handoff to the latest non-empty conversation. */
export function AgentTeamUseAction({ enabled, useSessions, startUse, t }: UseActionProps): ReactNode {
  const target = useSessions(recentNonblankSession)
  if (!enabled) return null
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={target === undefined}
      title={target === undefined ? t('useUnavailable') : undefined}
      onClick={() => { if (target !== undefined) startUse(target) }}
    >
      {t('useNow')}
    </Button>
  )
}

type ComposerHintProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<typeof NS>
  & InjectFace<Pick<AgentTeamOnboardingInjected, 'hooks' | 'fillPrompt' | 'dismissOnboarding'>>

/** Input-adjacent example shown while the Agent Teams header action is introduced. */
export function AgentTeamComposerHint({
  sessionId, useAgentTeamOnboarding, fillPrompt, dismissOnboarding, t,
}: ComposerHintProps): ReactNode {
  const visible = useAgentTeamOnboarding(state => state.targetSessionId === sessionId)
  if (!visible) return null
  return (
    <div className={css.composerHint} role="status" data-agent-team-composer-hint>
      <button type="button" className={css.prompt} onClick={() => { fillPrompt(sessionId) }}>
        <IconUserOutline16 size={14} aria-hidden="true" />
        <span>{t('composerHint')}</span>
      </button>
      <button
        type="button"
        className={css.dismiss}
        aria-label={t('onboardingDismiss')}
        onClick={() => { dismissOnboarding(sessionId) }}
      >
        <IconCloseOutline16 size={13} aria-hidden="true" />
      </button>
    </div>
  )
}
