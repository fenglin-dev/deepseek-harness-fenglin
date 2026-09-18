/** Pairing Ceremony state and async ordering for one NAS Runtime. */

import type { DesktopNasBridge, NasRuntimeStatus } from './bridge.ts'

/** Editable values entered before a NAS Runtime becomes a Paired Device. */
export interface NasPairingDraft {
  readonly baseUrl: string
  readonly deviceName: string
  readonly code: string
}

/** Certificate inspection retained for the exact address that produced it. */
export interface NasPairingInspection {
  readonly baseUrl: string
  readonly fingerprint: string
}

/** Current stage of the user-visible Pairing Ceremony. */
export type NasPairingPhase =
  | { readonly phase: 'editing' }
  | { readonly phase: 'inspecting'; readonly baseUrl: string; readonly attempt: number }
  | { readonly phase: 'reviewing'; readonly inspection: NasPairingInspection; readonly trusted: boolean }
  | { readonly phase: 'pairing'; readonly inspection: NasPairingInspection }

/** Stable observable state rendered by the NAS Runtime settings page. */
export interface NasPairingSnapshot {
  readonly draft: NasPairingDraft
  readonly stage: NasPairingPhase
  readonly error?: string
  readonly busy: boolean
  readonly canInspect: boolean
  readonly canPair: boolean
}

/** User intent accepted by the Pairing Ceremony module. */
export type NasPairingIntent =
  | { readonly type: 'edit'; readonly field: keyof NasPairingDraft; readonly value: string }
  | { readonly type: 'trust'; readonly trusted: boolean }
  | { readonly type: 'dismiss-error' }

/** Minimal Desktop adapter required by the Pairing Ceremony module. */
export type NasPairingAdapter = Pick<DesktopNasBridge, 'inspect' | 'pair'>

/** Observable Pairing Ceremony interface used by React and tests. */
export interface NasPairingCeremony {
  getSnapshot(): NasPairingSnapshot
  subscribe(listener: () => void): () => void
  send(intent: NasPairingIntent): void
  inspect(): Promise<void>
  pair(): Promise<NasRuntimeStatus | undefined>
  dispose(): void
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function snapshot(
  draft: NasPairingDraft,
  stage: NasPairingPhase,
  error?: string,
): NasPairingSnapshot {
  const busy = stage.phase === 'inspecting' || stage.phase === 'pairing'
  return Object.freeze({
    draft: Object.freeze(draft),
    stage,
    ...(error === undefined ? {} : { error }),
    busy,
    canInspect: !busy && draft.baseUrl !== '',
    canPair: stage.phase === 'reviewing' && stage.trusted
      && draft.code !== '' && draft.deviceName.trim() !== '',
  })
}

/**
 * Create one Pairing Ceremony owner for a Desktop NAS bridge.
 * @param adapter - certificate inspection and pairing operations.
 * @returns observable state plus intent methods; dispose it when the caller unmounts.
 */
export function createNasPairingCeremony(adapter: NasPairingAdapter): NasPairingCeremony {
  let current = snapshot({ baseUrl: '', deviceName: '', code: '' }, { phase: 'editing' })
  let nextAttempt = 0
  let disposed = false
  let lifecycle = 0
  const listeners = new Set<() => void>()

  const publish = (next: NasPairingSnapshot): void => {
    if (disposed) return
    current = next
    for (const listener of [...listeners]) listener()
  }

  const send = (intent: NasPairingIntent): void => {
    if (disposed) return
    if (intent.type === 'dismiss-error') {
      if (current.error !== undefined) publish(snapshot(current.draft, current.stage))
      return
    }
    if (intent.type === 'trust') {
      if (current.stage.phase !== 'reviewing') return
      publish(snapshot(current.draft, { ...current.stage, trusted: intent.trusted }, current.error))
      return
    }

    const draft = { ...current.draft, [intent.field]: intent.value }
    if (intent.field !== 'baseUrl') {
      publish(snapshot(draft, current.stage, current.error))
      return
    }

    nextAttempt += 1
    const stage = current.stage.phase === 'pairing' ? current.stage : { phase: 'editing' as const }
    publish(snapshot(draft, stage, current.error))
  }

  const inspect = async (): Promise<void> => {
    if (disposed || !current.canInspect) return
    const baseUrl = current.draft.baseUrl
    const attempt = ++nextAttempt
    const operationLifecycle = lifecycle
    publish(snapshot(current.draft, { phase: 'inspecting', baseUrl, attempt }))
    try {
      const result = await adapter.inspect(baseUrl)
      if (operationLifecycle !== lifecycle || current.stage.phase !== 'inspecting'
        || current.stage.attempt !== attempt || current.draft.baseUrl !== baseUrl) return
      publish(snapshot(current.draft, {
        phase: 'reviewing',
        inspection: { baseUrl, fingerprint: result.fingerprint },
        trusted: false,
      }))
    } catch (error) {
      if (operationLifecycle !== lifecycle || current.stage.phase !== 'inspecting' || current.stage.attempt !== attempt) return
      publish(snapshot(current.draft, { phase: 'editing' }, messageOf(error)))
    }
  }

  const ownsPairing = (inspection: NasPairingInspection): boolean => {
    const stage: NasPairingPhase = current.stage
    return stage.phase === 'pairing' && stage.inspection === inspection
  }

  const pair = async (): Promise<NasRuntimeStatus | undefined> => {
    if (disposed || !current.canPair || current.stage.phase !== 'reviewing') return undefined
    const inspection = current.stage.inspection
    const operationLifecycle = lifecycle
    const request = {
      baseUrl: inspection.baseUrl,
      code: current.draft.code,
      deviceName: current.draft.deviceName,
      certificateFingerprint: inspection.fingerprint,
    }
    publish(snapshot(current.draft, { phase: 'pairing', inspection }))
    try {
      const status = await adapter.pair(request)
      if (operationLifecycle !== lifecycle || !ownsPairing(inspection)) return undefined
      publish(snapshot({ ...current.draft, code: '' }, { phase: 'editing' }))
      return status
    } catch (error) {
      if (operationLifecycle !== lifecycle || !ownsPairing(inspection)) return undefined
      const stage: NasPairingPhase = current.draft.baseUrl === inspection.baseUrl
        ? { phase: 'reviewing', inspection, trusted: true }
        : { phase: 'editing' }
      publish(snapshot(current.draft, stage, messageOf(error)))
      return undefined
    }
  }

  return {
    getSnapshot: () => current,
    subscribe: (listener) => {
      if (disposed) return () => {}
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    send,
    inspect,
    pair,
    dispose: () => {
      disposed = true
      lifecycle += 1
      nextAttempt += 1
      listeners.clear()
    },
  }
}
