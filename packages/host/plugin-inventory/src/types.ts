import type { Branded } from '@deepseek-ai/dsh-brand'
import type { PluginLocalizedMeta } from '@deepseek-ai/dsh-package-manifest'

/** Stable Loader-tree identity of one configured plugin entry. */
export type PluginEntryId = Branded<'PluginEntryId'>

/** Lifecycle state of an entry's root Fiber, or null when it has no live root Fiber. */
export type PluginFiberPhase =
  | 'pending'
  | 'loading'
  | 'active'
  | 'failed'
  | 'unloading'
  | null

/** One non-group Loader entry exposed to trusted clients. */
export interface PluginInventoryEntry {
  readonly entryId: PluginEntryId
  /** Exact module specifier imported by the Loader entry. */
  readonly moduleName: string
  /** Local package display metadata, independent of whether the entry is enabled. */
  readonly meta?: PluginLocalizedMeta
  /** Effective Loader enablement, including disabled ancestor groups. */
  readonly enabled: boolean
  readonly fiberPhase: PluginFiberPhase
}

/** Effective enablement of one preset composition row. */
export type PresetPluginEnablement = boolean | 'conditional'

/** One plugin row an agent preset's composition names. */
export interface AgentPresetPluginRow {
  /** Composition row id, or null when the row declares none. */
  readonly entryId: string | null
  /** Module specifier the row names. */
  readonly moduleName: string
  /** Local package display metadata, independent of whether the preset is mounted. */
  readonly meta?: PluginLocalizedMeta
  /**
   * Effective enablement, including disabled ancestor groups. `'conditional'`
   * marks a `!!js` disabled expression on a composition no session has
   * mounted, which only a Loader context can decide.
   */
  readonly enabled: PresetPluginEnablement
  /** The row's own `!!js` disabled expression, when it carries one. */
  readonly condition?: string
  /** Root-fiber phase when the composition is live; null otherwise. */
  readonly fiberPhase: PluginFiberPhase
}

/** One agent preset's identity and flattened composition in the inventory. */
export interface AgentPresetPluginGroup {
  /** Stable preset id. */
  readonly id: string
  /** Display name the preset published; a reader falls back to the id. */
  readonly name?: string
  /** Whether a session naming no preset composes this one. */
  readonly isDefault: boolean
  /** Why this preset's composition cannot be read; absent when rows answer. */
  readonly broken?: string
  /** Plugin rows in composition order; empty when the preset is broken. */
  readonly rows: readonly AgentPresetPluginRow[]
}

/** Point-in-time inventory returned by the plugin inventory Remote. */
export interface PluginInventorySnapshot {
  /** Whether this Host exposes persistent current-profile management. */
  readonly managementAvailable?: boolean
  readonly entries: readonly PluginInventoryEntry[]
  /**
   * Per-preset compositions, present only when an agent-preset roster is
   * composed in this deployment.
   */
  readonly agentPresets?: readonly AgentPresetPluginGroup[]
}

/** Stable identity of one background profile-plugin installation. */
export type PluginInstallId = Branded<'PluginInstallId'>

/** Closed desktop recipes that install and compose an official experimental provider. */
export type ExperimentalCapabilityRecipe =
  | 'browser-use-playwright-visible'
  | 'browser-use-devtools-visible'
  | 'computer-use-native'
  | 'computer-use-mcp'

/** Registry package request accepted by the profile plugin installer. */
export interface PluginInstallRequest {
  /** Profile that will receive the dependency and bundle layer. */
  readonly profile: string
  /** npm registry package specifier, optionally with a version or dist-tag. */
  readonly packageSpec: string
  /** Optional fixed composition recipe; arbitrary module names and config never cross the wire. */
  readonly experimentalCapability?: ExperimentalCapabilityRecipe
}

/** Exact registry package removal accepted by the profile plugin manager. */
export interface PluginUninstallRequest {
  /** Profile from which the dependency and bundle layer will be removed. */
  readonly profile: string
  /** Exact installed npm package name. Versions, paths, and URLs are rejected. */
  readonly packageName: string
}

/** Observable lifecycle of one package-manager process. */
export type PluginInstallPhase =
  | 'running'
  | 'paused'
  | 'cancelled'
  | 'succeeded'
  | 'repaired'
  | 'quarantined'
  | 'failed'

/** User-visible stage within one running package-manager operation. */
export type PluginInstallProgressStage = 'preparing' | 'resolving' | 'downloading' | 'installing' | 'verifying'

/** Determinate progress is published only after pnpm has established a stable total. */
export interface PluginInstallProgress {
  readonly stage: PluginInstallProgressStage
  /** Integer percentage from 0 through 100; absent means indeterminate. */
  readonly percent?: number
  /** Completed dependency units when pnpm exposes a stable total. */
  readonly completed?: number
  /** Total dependency units paired with {@link completed}. */
  readonly total?: number
}

/** Cursor request for bounded live installer output. */
export interface PluginInstallOutputRequest {
  readonly installId: PluginInstallId
  /** Byte offset returned by the previous read; zero starts at retained output. */
  readonly offset: number
}

/** Incremental, sanitized terminal output for one installer job. */
export interface PluginInstallOutputRead {
  readonly text: string
  readonly nextOffset: number
  /** True when output before the requested offset is no longer retained. */
  readonly lossy: boolean
  readonly settled: boolean
}

/** Point-in-time state returned when starting or polling an installation. */
export interface PluginInstallSnapshot {
  readonly installId: PluginInstallId
  readonly profile: string
  readonly packageSpec: string
  /** Exact CLI command represented by the structured request. */
  readonly command: string
  readonly phase: PluginInstallPhase
  /** Current package-manager stage and optional determinate dependency progress. */
  readonly installProgress?: PluginInstallProgress
  /** Exit code when the package-manager process settled normally. */
  readonly exitCode?: number | null
  /** Bounded package-manager output for local troubleshooting after failure. */
  readonly diagnostic?: string
}

/** Official native coding products exposed by the external-tools surface. */
export type ExternalToolId = 'codex' | 'claude-code'

/** Host connection state projected beside Profile Bundle installation state. */
export interface ExternalToolsSnapshot {
  readonly scope: 'complete-presets'
  readonly codex: boolean
  readonly claudeCode: boolean
}

/** Fixed-provider toggle accepted by the guarded managed-preset operation. */
export interface ExternalToolToggleRequest {
  readonly tool: ExternalToolId
  readonly enabled: boolean
}
