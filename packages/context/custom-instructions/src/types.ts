/** Durable settings vocabulary for user-authored global and Workspace instructions. */

/** Settings namespace read by the Host injector and trusted first-party editor. */
export const CUSTOM_INSTRUCTIONS_SETTINGS_NAMESPACE = 'custom-instructions'

/** Maximum characters accepted for one saved custom instruction. */
export const CUSTOM_INSTRUCTION_MAX_CHARS = 32_000

/** One immutable saved revision. */
export interface CustomInstructionVersion {
  id: string
  text: string
  createdAt: number
}

/** Revision history and the revision currently injected into model requests. */
export interface CustomInstructionHistory {
  activeVersion?: string
  versions: CustomInstructionVersion[]
}

/** Remembered Session diagnostic-export disclosure choice. */
export type CustomInstructionExportPreference = 'ask' | 'include' | 'exclude'

/** Complete custom-instruction settings section. */
export interface CustomInstructionSettings {
  global: CustomInstructionHistory
  workspaces: Record<string, CustomInstructionHistory>
  diagnosticExport: {
    preference: CustomInstructionExportPreference
  }
}
