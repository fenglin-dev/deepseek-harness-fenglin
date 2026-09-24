/** Durable settings vocabulary for user-authored global and Workspace instructions. */

/** Settings namespace read by the Host injector and trusted first-party editor. */
export const CUSTOM_INSTRUCTIONS_SETTINGS_NAMESPACE = 'custom-instructions'

/** Maximum characters accepted for one saved custom instruction. */
export const CUSTOM_INSTRUCTION_MAX_CHARS = 32_000

/** One immutable saved revision. */
export interface CustomInstructionVersion {
  /** Stable identifier for this saved revision. */
  id: string
  /** Instruction text supplied to matching model requests. */
  text: string
  /** Creation time in Unix milliseconds. */
  createdAt: number
}

/** Revision history and the revision currently injected into model requests. */
export interface CustomInstructionHistory {
  /** Revision selected for injection, or absent when none is active. */
  activeVersion?: string
  /** Saved revisions retained for switching and recovery. */
  versions: CustomInstructionVersion[]
}

/** Remembered Session diagnostic-export disclosure choice. */
export type CustomInstructionExportPreference = 'ask' | 'include' | 'exclude'

/** Complete custom-instruction settings section. */
export interface CustomInstructionSettings {
  /** Instructions applied to every Workspace. */
  global: CustomInstructionHistory
  /** Instructions indexed by Workspace identity. */
  workspaces: Record<string, CustomInstructionHistory>
  /** Session diagnostic-export disclosure preference. */
  diagnosticExport: {
    /** Whether to ask, include, or exclude instructions in an export. */
    preference: CustomInstructionExportPreference
  }
}
