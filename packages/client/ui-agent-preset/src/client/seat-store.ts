/**
 * Hero-chip controller: which preset the NEXT session gets.
 *
 * The new-session screen has no session, so a pick is staged rather than
 * applied. It reaches a session when one becomes current and is still blank —
 * whether the workspace connect created it or reused an existing blank one,
 * which is why staging cannot simply ride along on `sessions.create`.
 *
 * The stage is forgotten once applied: the next new session starts from the
 * deployment default again, matching the workspace picker beside it.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.remote merge into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {} from '@deepseek-ai/dsh-agent-presets/types'
import { presetOptions, readRoster } from './settings-store.ts'
import type { AgentPresetOption } from './settings-store.ts'

const PREFLIGHT_TIMEOUT_MS = 15_000

function failureReason(error: { message: string; details: object }): string {
  const reason: unknown = (error.details as { reason?: unknown }).reason
  return typeof reason === 'string' ? reason : error.message
}

function thrownReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Hero-chip snapshot. */
export interface AgentPresetSeatState {
  /** Presets the deployment supplies; empty means the chip renders nothing. */
  options: readonly AgentPresetOption[]
  /** The staged choice, empty until the roster loads. */
  current: string
  /** A rejected apply's message, cleared by the next attempt. */
  error: string | null
  busy: boolean
  /**
   * One-shot cue that the chip should introduce itself (the creator-draft
   * entry staged the pick from another screen, so the user never touched the
   * chip); the renderer clears it via `introduced()` once played.
   */
  introduce: boolean
}

const INITIAL: AgentPresetSeatState = {
  options: [], current: '', error: null, busy: false, introduce: false,
}

/** Stages the next session's preset and applies it when one appears. */
export class AgentPresetSeatController {
  /** Chip snapshot the renderer subscribes to. */
  readonly store: SnapshotStore<AgentPresetSeatState> = createSnapshotStore(INITIAL)

  /**
   * The deployment default, so a consumed stage can fall back to it without
   * re-reading the roster.
   */
  private fallback = ''

  /** Set while a pick is waiting for a session; cleared once applied. */
  private staged: string | undefined

  constructor(
    private readonly ctx: ClientContext,
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession: () => Pick<
      SessionSummary,
      'id' | 'blank' | 'projectionValues'
    > | undefined,
  ) {}

  private set(patch: Partial<AgentPresetSeatState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /**
   * Read the roster and open the chip on the deployment default.
  * @returns once the snapshot reflects the host.
  */
  async load(): Promise<void> {
    const roster = await readRoster(this.ctx)
    if (!roster.ok) {
      this.set({ error: roster.error })
      return
    }
    const { presets } = roster.value
    const options = presetOptions(presets)
    const configuredDefault = presets.find(preset => preset.isDefault)?.id
    this.fallback = options.find(option => option.id === configuredDefault)?.id
      ?? options.find(option => option.id === 'standard')?.id
      ?? options[0]?.id
      ?? ''
    const session = this.currentSession()
    this.set({
      options,
      // Staged pick first, then the composition the current session
      // already carries, then the deployment default. The middle term is
      // what keeps a late-landing load from regressing the display after
      // an applied stage was consumed — the chip mounts (and loads) only
      // once the flow's session is current, so the reply can arrive after
      // apply() already composed it.
      current: this.staged ?? (session === undefined ? this.fallback : presetOf(session) ?? ''),
      error: null,
    })
  }

  /**
   * Stage one preset for the next session, applying it immediately when a
   * blank session is already current.
   *
   * The refusal is returned as well as stored, because the two readers need
   * different things from it: the chip's own label carries the standing state,
   * while the caller that made this pick is the one that has to say why the
   * label came back — and only it knows the pick was a person's, not the
   * applier catching up with a session that just became current.
   * @param id - the preset to stage.
   * @returns the refusal text, or undefined once the pick settled.
   */
  async select(id: string): Promise<string | undefined> {
    if (this.store.getSnapshot().busy) return undefined
    const previous = this.store.getSnapshot().current
    this.set({ busy: true, error: null })
    const controller = new AbortController()
    const timeout = setTimeout(() => { controller.abort() }, PREFLIGHT_TIMEOUT_MS)
    try {
      const checked = await this.ctx.remote.agentPresets.preflight(id, controller.signal)
      if (!checked.ok) {
        this.rejectSelection(
          id,
          previous,
          failureReason(checked.error),
          checked.error.code === 'agent-preset/invalid',
        )
        return this.store.getSnapshot().error ?? undefined
      }
      this.stage(id)
      await this.apply()
    } catch (error: unknown) {
      // A transport reset or timeout says nothing about the preset itself.
      // Keep it in the chooser so reconnecting can retry the same choice.
      this.rejectSelection(id, previous, thrownReason(error), false)
    } finally {
      clearTimeout(timeout)
      this.set({ busy: false })
    }
    return this.store.getSnapshot().error ?? undefined
  }

  private rejectSelection(id: string, previous: string, reason: string, remove: boolean): void {
    this.staged = undefined
    const options = remove
      ? this.store.getSnapshot().options.filter(option => option.id !== id)
      : this.store.getSnapshot().options
    const current = options.some(option => option.id === previous)
      ? previous
      : options.find(option => option.id === this.fallback)?.id ?? options[0]?.id ?? ''
    this.set({ options, current, error: reason })
  }

  /**
   * Stage a pick WITHOUT the immediate apply, for a flow that starts the
   * receiving session after the pick (the settings section's creator entry).
   * `select()`'s immediate apply would meet the still-current running session
   * and drop the stage as unservable; staging alone leaves it for the
   * list-change applier, which fires when the started session becomes
   * current.
   * @param id - the preset to stage.
   * @param introduce - true when the stage came from another screen and the
   * chip should announce itself on the session it lands on.
   */
  stage(id: string, introduce = false): void {
    this.staged = id
    this.set({ current: id, error: null, introduce })
  }

  /** Acknowledge the introduction cue once the chip has played it. */
  introduced(): void {
    if (!this.store.getSnapshot().introduce) return
    this.set({ introduce: false })
  }

  /**
   * Hand the staged choice to the current session, if there is one to take it.
   *
   * Called both by `select()` and by whoever observes the current session
   * changing, because the session may appear either before or after the pick.
   * @returns once the switch settled, or immediately when there is nothing to do.
   */
  async apply(): Promise<void> {
    const staged = this.staged
    const session = this.currentSession()
    if (staged === undefined) {
      const current = session === undefined ? this.fallback : presetOf(session) ?? ''
      if (current !== this.store.getSnapshot().current) this.set({ current })
      return
    }
    if (session === undefined) return
    // A started session's history was produced under its own composition; the
    // host refuses the swap, so the stage is no longer meaningful.
    if (!session.blank || presetOf(session) === staged) {
      this.staged = undefined
      return
    }
    this.set({ busy: true, error: null })
    try {
      const result = await this.ctx.remote.agentPresets.select(session.id, staged)
      this.staged = undefined
      if (!result.ok) {
        this.set({ error: failureReason(result.error), current: presetOf(session) ?? '' })
        return
      }
      // Consumed: the next new session opens on the deployment default again.
      this.set({ current: result.value })
    } catch (error: unknown) {
      this.staged = undefined
      this.set({ error: thrownReason(error), current: presetOf(session) ?? '' })
    } finally {
      this.set({ busy: false })
    }
  }
}

function presetOf(
  session: Pick<SessionSummary, 'projectionValues'> | undefined,
): string | undefined {
  const value = session?.projectionValues?.agentPreset
  return typeof value === 'string' ? value : undefined
}
