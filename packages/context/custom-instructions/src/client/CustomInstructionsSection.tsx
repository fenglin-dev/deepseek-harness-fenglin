import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CUSTOM_INSTRUCTION_MAX_CHARS } from '../types.ts'
import { activeCustomInstruction, type CustomInstructionsClient } from './service.ts'
import css from './CustomInstructions.module.css'

export interface CustomInstructionsSectionInjected {
  customInstructions: CustomInstructionsClient
}

export type CustomInstructionsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.customInstructions'>
  & InjectFace<CustomInstructionsSectionInjected>

type ScopeId = 'global' | `workspace:${string}`

function initialScope(preferredSubsectionId: string | undefined): ScopeId {
  return preferredSubsectionId?.startsWith('workspace:') === true
    ? preferredSubsectionId as `workspace:${string}`
    : 'global'
}

/** Full editor for global and Workspace-scoped custom prompts. */
export function CustomInstructionsSection({
  customInstructions, preferredSubsectionId, useWorkspaces, t,
}: CustomInstructionsSectionProps) {
  const snapshot = useSyncExternalStore(
    customInstructions.scope.subscribe.bind(customInstructions.scope),
    customInstructions.scope.getSnapshot.bind(customInstructions.scope),
  )
  const workspaces = useWorkspaces(state => state.items)
  const [scopeId, setScopeId] = useState<ScopeId>(() => initialScope(preferredSubsectionId))
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setScopeId(initialScope(preferredSubsectionId)) }, [preferredSubsectionId])
  const history = useMemo(() => {
    if (snapshot.value === undefined) return undefined
    if (scopeId === 'global') return snapshot.value.global
    return snapshot.value.workspaces[scopeId.slice('workspace:'.length)]
  }, [scopeId, snapshot.value])
  const activeText = activeCustomInstruction(history)?.text ?? ''
  useEffect(() => {
    setDraft(activeText)
    setSaved(false)
    setError(null)
  }, [activeText, scopeId])

  if (snapshot.status === 'loading') return <p className={css.status}>{t('loading')}</p>
  if (snapshot.status !== 'ready' || snapshot.value === undefined) {
    return <p className={css.status} role="alert">{t('unavailable')}</p>
  }
  const workspaceId = scopeId === 'global' ? undefined : scopeId.slice('workspace:'.length) as WorkspaceId
  const changed = draft.trim() !== activeText
  const save = async (): Promise<void> => {
    if (saving || !snapshot.writable || !changed) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await customInstructions.save(workspaceId ?? 'global', draft, snapshot.revision)
      setSaved(true)
    } catch {
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={css.section}>
      <header className={css.intro}>
        <h2>{t('title')}</h2>
        <p>{t('description')}</p>
      </header>
      <label className={css.field}>
        <span className={css.label}>{t('scope')}</span>
        <select value={scopeId} onChange={(event) => { setScopeId(event.currentTarget.value as ScopeId) }}>
          <option value="global">{t('global')}</option>
          {workspaces.map(workspace => (
            <option key={workspace.workspaceId} value={`workspace:${workspace.workspaceId}`}>{workspace.title}</option>
          ))}
        </select>
      </label>
      <p className={css.scopeDescription}>
        {scopeId === 'global' ? t('globalDescription') : t('workspaceDescription')}
      </p>
      <label className={css.field}>
        <span className={css.label}>{t('prompt')}</span>
        <textarea
          value={draft}
          maxLength={CUSTOM_INSTRUCTION_MAX_CHARS}
          placeholder={t('placeholder')}
          onChange={(event) => { setDraft(event.currentTarget.value); setSaved(false) }}
        />
      </label>
      <div className={css.meta}>
        <span>{t('characterCount', { used: draft.length, limit: CUSTOM_INSTRUCTION_MAX_CHARS })}</span>
        <span>{draft.trim() === '' ? t('emptyDisables') : t('precedence')}</span>
      </div>
      {error !== null && <p className={css.error} role="alert">{error}</p>}
      <div className={css.actions}>
        {saved && <span className={css.saved} role="status">{t('saved')}</span>}
        {!changed && activeText === '' && <span className={css.disabled}>{t('disabled')}</span>}
        <Button disabled={!snapshot.writable || !changed || saving} onClick={() => { void save() }}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
      <div className={css.diagnostic}>
        <div>
          <div className={css.label}>{t('diagnosticTitle')}</div>
          <p>{t('diagnosticDescription')}</p>
        </div>
        <Button
          variant="outline"
          disabled={snapshot.value.diagnosticExport.preference === 'ask'}
          onClick={() => { void customInstructions.setDiagnosticExportPreference('ask') }}
        >
          {t('diagnosticAsk')}
        </Button>
      </div>
    </section>
  )
}
