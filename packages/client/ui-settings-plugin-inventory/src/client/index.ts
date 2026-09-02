/** Read-only Host plugin inventory registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the shipped preset dictionaries used by presetDisplayText.
import type {} from '@deepseek-ai/dsh-client-ui-agent-preset/client'
import { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
import { PluginInventorySettingsTab, type PluginInventorySettingsTabInjected } from './PluginInventorySettingsTab.tsx'
import { PluginDiagnosticsSection, type PluginDiagnosticsSectionInjected } from './PluginDiagnosticsSection.tsx'
import { PluginDiscovery } from './PluginDiscovery.tsx'
import type { PluginDiscoveryInjected } from './PluginDiscovery.tsx'
import { ExternalToolsSection, type ExternalToolsSectionInjected } from './ExternalToolsSection.tsx'
import { resolveExternalToolInstallRequest } from './external-tool-compatibility-bridge.ts'
import { DiagnosticLabProgressCard } from './DiagnosticLabProgressCard.tsx'
import { QuarantineNotice, type QuarantineNoticeInjected } from './QuarantineNotice.tsx'
import {
  ImportedPluginRestoreSection,
  importedPluginRestoreInjected,
} from './ImportedPluginRestore.tsx'
import { readImportedPluginRestoreBridge } from './imported-restore-bridge.ts'
import { desktopPluginSnapshotsAvailable } from './plugin-snapshot-bridge.ts'
import { desktopSettingsRecoveryAvailable } from './settings-recovery-bridge.ts'
import { en, zh, type PluginInventoryLocaleKey } from './locales.ts'

export type { PluginInventorySettingsTabInjected, PluginInventorySettingsTabProps } from './PluginInventorySettingsTab.tsx'
export type { PluginInventoryLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Read-only Host plugin inventory copy. */
    'settings.pluginInventory': PluginInventoryLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.pluginInventory'

/** Services required by the Settings registration and generated Remote face. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']

/** Contribute the lazy inventory tab to the Plugins settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-plugin-inventory: dictionaries')

  const t = ctx.locale.bind(NS)
  const list: PluginInventorySettingsTabInjected['list'] = async () => {
    const result = await ctx.remote.pluginInventory.list()
    if (!result.ok) {
      throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const getHostInstall: PluginInventorySettingsTabInjected['getInstall'] = async (installId) => {
    const result = await ctx.remote.pluginInventory.getInstall(installId)
    if (!result.ok) throw new Error(`pluginInventory.getInstall failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const getInstall: PluginInventorySettingsTabInjected['getInstall'] = installId => (
    getPluginInstall(installId, getHostInstall)
  )
  const startUninstall: PluginInventorySettingsTabInjected['startUninstall'] = async (request) => {
    const result = await ctx.remote.pluginInventory.startUninstall(request)
    if (!result.ok) throw new Error(`pluginInventory.startUninstall failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const agentPresetCopy = ctx.locale.bind('settings.agentPreset')
  const presetName: PluginInventorySettingsTabInjected['presetName'] = preset =>
    presetDisplayText(preset, agentPresetCopy).name
  const injected = (): PluginInventorySettingsTabInjected => ({
    list,
    getInstall,
    startUninstall,
    presetName,
  })
  const diagnosticLab = desktopDiagnosticLabAvailable()
    ? {
      listScenarios: listDesktopDiagnosticLabScenarios,
      current: getCurrentDesktopDiagnosticLabRun,
      start: startDesktopDiagnosticLab,
      getRun: getDesktopDiagnosticLabRun,
      cancel: cancelDesktopDiagnosticLabRun,
      restoreAll: restoreAllDesktopDiagnosticLabRun,
      exportReport: exportDesktopDiagnosticLabRun,
      subscribe: subscribeDesktopDiagnosticLab,
    }
    : undefined
  const pluginSnapshots = desktopPluginSnapshotsAvailable()
  const settingsRecovery = desktopSettingsRecoveryAvailable()
  const diagnosticsInjected = (): PluginDiagnosticsSectionInjected => ({
    list,
    getInstall,
    startUninstall,
    ...(diagnosticLab === undefined ? {} : { diagnosticLab }),
    ...(pluginSnapshots === undefined ? {} : { pluginSnapshots }),
    ...(settingsRecovery === undefined ? {} : { settingsRecovery }),
    startDependencyDoctor: async (request) => {
      const result = await ctx.remote.pluginInventory.startDependencyDoctor(request)
      if (!result.ok) throw new Error(`pluginInventory.startDependencyDoctor failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    getDependencyDoctor: async (doctorId) => {
      const result = await ctx.remote.pluginInventory.getDependencyDoctor(doctorId)
      if (!result.ok) throw new Error(`pluginInventory.getDependencyDoctor failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    startQuarantineRetry: async (request) => {
      const result = await ctx.remote.pluginInventory.startQuarantineRetry(request)
      if (!result.ok) throw new Error(`pluginInventory.startQuarantineRetry failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    approveQuarantineBuild: async (request) => {
      const result = await ctx.remote.pluginInventory.approveQuarantineBuild(request)
      if (!result.ok) throw new Error(`pluginInventory.approveQuarantineBuild failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    approveDiagnosticBuild: async (request) => {
      const result = await ctx.remote.pluginInventory.approveDiagnosticBuild(request)
      if (!result.ok) throw new Error(`pluginInventory.approveDiagnosticBuild failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    exportDiagnostics: async () => {
      const result = await ctx.remote.pluginInventory.exportDiagnostics()
      if (!result.ok) throw new Error(`pluginInventory.exportDiagnostics failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    uninstallQuarantine: async (request) => {
      const result = await ctx.remote.pluginInventory.uninstallQuarantine(request)
      if (!result.ok) throw new Error(`pluginInventory.uninstallQuarantine failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    dismissDependencyHealth: async (request) => {
      const result = await ctx.remote.pluginInventory.dismissDependencyHealth(request)
      if (!result.ok) throw new Error(`pluginInventory.dismissDependencyHealth failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    openPluginMarket: (packageName) => {
      ctx.settingsNavigation.open({ sectionId: 'market', subsectionId: `discover:${packageName}` })
    },
  })
  const startControlledInstall = (request: Parameters<typeof startPluginInstall>[0]) => startPluginInstall(
    request,
    async (fallbackRequest) => {
      const result = await ctx.remote.pluginInventory.startInstall(fallbackRequest)
      if (!result.ok) {
        throw new Error(`pluginInventory.startInstall failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    },
  )
  const discoveryInjected = (): PluginDiscoveryInjected => ({
    list,
    startInstall: startControlledInstall,
    getInstall,
    openSettings: (sectionId, subsectionId) => {
      ctx.settingsNavigation.open({ sectionId, ...(subsectionId === undefined ? {} : { subsectionId }) })
    },
  })
  const quarantineNoticeInjected = (): QuarantineNoticeInjected => ({
    list,
    dismissDependencyHealth: diagnosticsInjected().dismissDependencyHealth,
    openDiagnostics: () => { ctx.settingsNavigation.open({ sectionId: 'diagnostics' }) },
  })
  const externalToolsInjected = (): ExternalToolsSectionInjected => ({
    list,
    getInstall,
    installExternalTool: async toolId => startControlledInstall(await resolveExternalToolInstallRequest(toolId)),
    externalTools: async () => {
      const result = await ctx.remote.pluginInventory.externalTools()
      if (!result.ok) throw new Error(`pluginInventory.externalTools failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    setExternalTool: async (tool, enabled) => {
      const result = await ctx.remote.pluginInventory.setExternalTool({ tool, enabled })
      if (!result.ok) throw new Error(`pluginInventory.setExternalTool failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
  })
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'all',
    order: 10,
    label: () => t('tab'),
    locale: NS,
    inject: injected,
  }, PluginInventorySettingsTab))
}
