import { installDiagnosticLabMissingSettingsSection } from '@deepseek-ai/dsh-settings'

export const name = 'diagnostic-loader-export-unavailable'

export function apply() {
  installDiagnosticLabMissingSettingsSection()
}
