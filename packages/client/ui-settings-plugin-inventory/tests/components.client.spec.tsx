// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginInventorySettingsTab } from '../src/client/PluginInventorySettingsTab.tsx'
import {
  PluginDiagnosticsSection,
  type PluginDiagnosticsSectionProps,
} from '../src/client/PluginDiagnosticsSection.tsx'
import { PluginDiscovery } from '../src/client/PluginDiscovery.tsx'
import {
  ExternalToolsSection,
  type ExternalToolsSectionProps,
} from '../src/client/ExternalToolsSection.tsx'
import type {
  PluginInventorySettingsTabInjected,
  PluginInventorySettingsTabProps,
} from '../src/client/PluginInventorySettingsTab.tsx'
import type { PluginDiscoveryProps } from '../src/client/PluginDiscovery.tsx'
import type {
  PluginDoctorId,
  PluginDoctorRequest,
  PluginDoctorSnapshot,
  PluginInstallId,
  PluginInstallRequest,
  PluginInstallSnapshot,
} from '@deepseek-ai/dsh-host-plugin-inventory/types'
import { en, type PluginInventoryLocaleKey } from '../src/client/locales.ts'
import { ImportedPluginRestore } from '../src/client/ImportedPluginRestore.tsx'
import type { ImportedPluginRestoreSnapshot } from '../src/client/imported-restore-bridge.ts'
import type {
  DiagnosticLabRunSnapshot,
  DiagnosticLabScenario,
} from '../src/client/bundled-install-bridge.ts'
import {
  buildPluginDiscoveryCatalog,
  resetPluginDiscoveryMemoryCache,
  writePluginDiscoveryCache,
} from '../src/client/plugin-discovery-preview.ts'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  resetPluginDiscoveryMemoryCache()
})

type Snapshot = Awaited<ReturnType<PluginInventorySettingsTabInjected['list']>>
const t = ((key: PluginInventoryLocaleKey): string => en[key]) as PluginInventorySettingsTabProps['t']

function props(list: PluginInventorySettingsTabInjected['list']): PluginInventorySettingsTabProps {
  return {
    t,
    list,
    startUninstall: vi.fn(),
    getInstall: vi.fn(),
  } as PluginInventorySettingsTabProps
}

const SNAPSHOT = {
  entries: [
    { entryId: '8a1b2c3d', moduleName: '@deepseek-ai/cordis-plugin-hmr', enabled: true, fiberPhase: 'active' },
    { entryId: 'pending', moduleName: 'cordis:pending-name', enabled: true, fiberPhase: 'pending' },
    { entryId: 'loading', moduleName: '@fixture/loading-name', enabled: true, fiberPhase: 'loading' },
    { entryId: 'failed', moduleName: '@fixture/failed-name', enabled: true, fiberPhase: 'failed' },
    { entryId: 'unloading', moduleName: '@fixture/unloading-name', enabled: true, fiberPhase: 'unloading' },
    { entryId: 'unobserved', moduleName: '@fixture/unobserved-name', enabled: true, fiberPhase: null },
    { entryId: 'disabled-entry', moduleName: '@deepseek-ai/dsh-host-directory-picker-native', enabled: false, fiberPhase: null },
    { entryId: 'dsh-market', moduleName: 'dshmarket', enabled: true, fiberPhase: 'active' },
  ],
  dependencyHealth: { lastRepair: null, issues: [], quarantined: [], safeMode: null },
} as unknown as Snapshot

describe('PluginInventorySettingsTab', () => {
  it('renders runtime status only for enabled plugins', async () => {
    const deferred = Promise.withResolvers<Snapshot>()
    const list = vi.fn(() => deferred.promise)
    const view = render(<PluginInventorySettingsTab {...props(list)} />)
    expect(screen.getByText(en.loading)).toBeTruthy()

    await act(async () => { deferred.resolve(SNAPSHOT) })
    expect(list).toHaveBeenCalledOnce()
    expect(screen.getByRole('searchbox', { name: en.search })).toBeTruthy()
    expect(screen.getByRole('heading', { name: en.catalog })).toBeTruthy()
    expect(view.container.querySelector('[data-plugin-count]')?.textContent).toBe('8')
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getAllByText(en.enabledTag)).toHaveLength(7)
    expect(screen.getByText(en.disabledTag)).toBeTruthy()
    for (const value of [
      'Mounted',
      'Waiting for dependencies',
      'Loading',
      'Mount failed',
      'Unloading',
      'Not mounted',
    ]) {
      expect(screen.getAllByRole('img', { name: value }).length).toBeGreaterThan(0)
    }
    const active = screen.getByRole('button', { name: 'hmr, Mounted, Enabled' })
    expect(active.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(active)
    expect(active.getAttribute('aria-expanded')).toBe('true')
    expect(view.container.querySelector('[data-loader-entry]')?.textContent).toBe('8a1b2c3d')
    expect(screen.getByText(en.configuration)).toBeTruthy()
    expect(screen.getByText(en.cordis)).toBeTruthy()
    fireEvent.click(active)
    expect(view.container.querySelector('[data-loader-entry]')).toBeNull()

    fireEvent.click(active)
    fireEvent.change(screen.getByRole('searchbox', { name: en.search }), {
      target: { value: 'disabled-entry' },
    })
    expect(view.container.querySelector('[data-loader-entry]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'directory-picker-native, Disabled' }))
    expect(screen.getAllByText(en.disabledTag)).toHaveLength(2)
    expect(screen.queryByText(en.cordis)).toBeNull()
    expect(screen.queryByText(en.unobserved)).toBeNull()
  })

  it('confirms and invokes the core dshmarket uninstall operation', async () => {
    const succeeded: PluginInstallSnapshot = {
      installId: 'remove-1' as PluginInstallId,
      profile: 'web',
      packageSpec: 'dshmarket',
      command: 'dsh plugin --profile web remove dshmarket',
      phase: 'succeeded',
      exitCode: 0,
    }
    const startUninstall = vi.fn(async () => succeeded)
    render(<PluginInventorySettingsTab {...props(async () => SNAPSHOT)} startUninstall={startUninstall} />)
    fireEvent.click(await screen.findByRole('button', { name: 'dshmarket, Mounted, Enabled' }))
    fireEvent.click(screen.getByRole('button', { name: en['uninstall.action'] }))
    const confirm = screen.getByRole('button', { name: en['uninstall.confirm.action'] })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: en['uninstall.confirm.acknowledge'] }))
    fireEvent.click(confirm)
    await waitFor(() => { expect(startUninstall).toHaveBeenCalledWith({ profile: 'web', packageName: 'dshmarket' }) })
    expect(await screen.findByText(en['uninstall.succeeded'])).toBeTruthy()
  })

  it('filters by module name or Loader entry id', async () => {
    render(<PluginInventorySettingsTab {...props(async () => SNAPSHOT)} />)
    const search = await screen.findByRole('searchbox', { name: en.search })

    fireEvent.change(search, { target: { value: 'disabled-entry' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('directory-picker-native')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'cordis-plugin-hmr' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('hmr')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'not-a-plugin' } })
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(en.emptySearch)).toBeTruthy()
  })

  it('shows a generic failure and retries into the empty state', async () => {
    const list = vi.fn<PluginInventorySettingsTabInjected['list']>()
      .mockRejectedValueOnce(new Error('private transport detail'))
      .mockResolvedValueOnce({
        entries: [],
        dependencyHealth: { lastRepair: null, issues: [], quarantined: [], safeMode: null },
      })
    render(<PluginInventorySettingsTab {...props(list)} />)

    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(screen.queryByText('private transport detail')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await waitFor(() => { expect(list).toHaveBeenCalledTimes(2) })
    expect(await screen.findByText(en.empty)).toBeTruthy()
  })

  it('contains a synchronous Remote failure and ignores a result after unmount', async () => {
    const syncFailure = vi.fn(() => { throw new Error('namespace unavailable') }) as PluginInventorySettingsTabInjected['list']
    const failed = render(<PluginInventorySettingsTab {...props(syncFailure)} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    failed.unmount()

    const deferred = Promise.withResolvers<Snapshot>()
    const pending = render(<PluginInventorySettingsTab {...props(() => deferred.promise)} />)
    pending.unmount()
    await act(async () => { deferred.resolve(SNAPSHOT) })

    const deferredFailure = Promise.withResolvers<Snapshot>()
    const pendingFailure = render(<PluginInventorySettingsTab {...props(() => deferredFailure.promise)} />)
    pendingFailure.unmount()
    await act(async () => { deferredFailure.reject(new Error('late failure')) })
  })
})

describe('ImportedPluginRestore', () => {
  const snapshot: ImportedPluginRestoreSnapshot = {
    firstPromptDismissed: false,
    ignored: false,
    sourceIssues: [],
    active: false,
    sourceCheckActive: false,
    restartRequired: false,
    entries: [
      { restoreId: 'plugin', packageName: 'community-plugin', declaredSpec: '^1.0.0', category: 'plugin', defaultSelected: true, recoverable: true, state: 'pending', availability: 'available' },
      { restoreId: 'codex', packageName: '@deepseek-ai/dsh-subagent-codex', declaredSpec: '^0.1.0', category: 'external-tool', tool: 'codex', defaultSelected: false, recoverable: true, state: 'pending', availability: 'unknown' },
      { restoreId: 'local', packageName: 'local-plugin', declaredSpec: 'file:../local', category: 'plugin', defaultSelected: false, recoverable: false, unsupportedReason: 'local-source', state: 'pending', availability: 'unavailable' },
    ],
  }

  it('renders a durable empty state on the dedicated Settings page', async () => {
    render(<ImportedPluginRestore
      t={t}
      getRestore={async () => undefined}
      checkSources={vi.fn()}
      startRestore={vi.fn()}
      chooseLocalDirectory={vi.fn()}
      chooseLocalArchive={vi.fn()}
      ignoreRestore={vi.fn()}
      restart={vi.fn()}
    />)

    expect(screen.getByText(en['restore.loading'])).toBeTruthy()
    expect(await screen.findByText(en['restore.empty'])).toBeTruthy()
  })

  it('defaults ordinary plugins on, keeps disconnected tools off, and submits opaque ids only', async () => {
    const startRestore = vi.fn(async () => ({ ...snapshot, active: true, firstPromptDismissed: true }))
    const chooseLocalDirectory = vi.fn(async () => snapshot)
    render(<ImportedPluginRestore
      t={t}
      getRestore={async () => snapshot}
      checkSources={async () => snapshot}
      startRestore={startRestore}
      chooseLocalDirectory={chooseLocalDirectory}
      chooseLocalArchive={vi.fn()}
      ignoreRestore={vi.fn()}
      restart={vi.fn()}
    />)
    const plugin = await screen.findByRole('checkbox', { name: /community-plugin/u })
    expect(screen.queryByRole('region', { name: en['restore.development.title'] })).toBeNull()
    const codex = screen.getByRole('checkbox', { name: /dsh-subagent-codex/u })
    const local = screen.getByRole('checkbox', { name: /local-plugin/u })
    expect((plugin as HTMLInputElement).checked).toBe(true)
    expect((codex as HTMLInputElement).checked).toBe(false)
    expect(local.hasAttribute('disabled')).toBe(true)
    const localDirectory = local.closest('li')?.querySelector<HTMLButtonElement>('button')
    expect(localDirectory).toBeTruthy()
    fireEvent.click(localDirectory as HTMLButtonElement)
    await waitFor(() => { expect(chooseLocalDirectory).toHaveBeenCalledWith('local') })
    expect(screen.getAllByRole('button', { name: en['restore.localArchive'] })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: en['restore.install'] }))
    await waitFor(() => { expect(startRestore).toHaveBeenCalledWith(['plugin']) })
  })

  it('keeps ignored entries visible on the dedicated recovery page', async () => {
    const ignoreRestore = vi.fn(async () => ({
      ...snapshot,
      ignored: true,
      entries: snapshot.entries.map(entry => ({ ...entry, state: 'ignored' as const })),
    }))
    render(<ImportedPluginRestore
      t={t}
      getRestore={async () => snapshot}
      checkSources={async () => snapshot}
      startRestore={vi.fn()}
      chooseLocalDirectory={vi.fn()}
      chooseLocalArchive={vi.fn()}
      ignoreRestore={ignoreRestore}
      restart={vi.fn()}
    />)
    fireEvent.click(await screen.findByRole('button', { name: en['restore.ignore'] }))
    await waitFor(() => { expect(ignoreRestore).toHaveBeenCalledOnce() })
    expect(screen.getByRole('heading', { name: en['restore.title'] })).toBeTruthy()
    expect(screen.getAllByText(en['restore.state.ignored'])).toHaveLength(3)
  })

  it('simulates source failures in development without invoking network or install operations', async () => {
    const checkSources = vi.fn(async () => snapshot)
    const startRestore = vi.fn(async () => snapshot)
    render(<ImportedPluginRestore
      development
      t={t}
      getRestore={async () => snapshot}
      checkSources={checkSources}
      startRestore={startRestore}
      chooseLocalDirectory={vi.fn()}
      chooseLocalArchive={vi.fn()}
      ignoreRestore={vi.fn()}
      restart={vi.fn()}
    />)

    await screen.findByRole('region', { name: en['restore.development.title'] })
    await waitFor(() => { expect(checkSources).toHaveBeenCalledOnce() })
    fireEvent.click(screen.getByRole('button', { name: en['restore.development.offline'] }))
    expect(screen.getAllByText(en['restore.availability.unknown']).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: en['restore.install'] }).hasAttribute('disabled')).toBe(true)
    expect(checkSources).toHaveBeenCalledOnce()
    expect(startRestore).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: en['restore.development.not-found'] }))
    expect(screen.getAllByText(en['restore.availability.unavailable']).length).toBeGreaterThan(0)
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: /community-plugin/u }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: en['restore.development.real'] }))
    await waitFor(() => {
      expect(screen.getByRole<HTMLInputElement>('checkbox', { name: /community-plugin/u }).checked).toBe(true)
    })
    expect(screen.getByRole('button', { name: en['restore.install'] }).hasAttribute('disabled')).toBe(false)
  })
})

describe('ExternalToolsSection', () => {
  const inventory = {
    entries: [{
      entryId: 'codex-entry',
      moduleName: '@deepseek-ai/dsh-subagent-codex',
      enabled: true,
      fiberPhase: 'active',
    }],
    dependencyHealth: { lastRepair: null, issues: [], quarantined: [], safeMode: null },
  } as unknown as Snapshot

  it('shows supported connections and honest placeholders for providers without an official bundle', async () => {
    render(<ExternalToolsSection {...({
      t,
      list: async () => inventory,
      externalTools: async () => ({ scope: 'complete-presets', codex: false, claudeCode: false }),
      setExternalTool: vi.fn(),
      startInstall: vi.fn(),
      getInstall: vi.fn(),
    } as ExternalToolsSectionProps)} />)

    expect(await screen.findByRole('heading', { name: en['external.title'] })).toBeTruthy()
    for (const name of ['Codex', 'Claude Code', 'Hermes', 'Trae']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy()
    }
    expect(screen.getAllByRole('button', { name: en['external.action.planned'] })).toHaveLength(2)
    expect(screen.getByRole('button', { name: en['external.action.connect'] })).toBeTruthy()
    expect(screen.getByRole('button', { name: en['external.action.install'] })).toBeTruthy()
  })

  it('connects Codex for complete modes', async () => {
    const setExternalTool = vi.fn(async () => ({
      scope: 'complete-presets' as const,
      codex: true,
      claudeCode: false,
    }))
    render(<ExternalToolsSection {...({
      t,
      list: async () => inventory,
      externalTools: async () => ({ scope: 'complete-presets', codex: false, claudeCode: false }),
      setExternalTool,
      startInstall: vi.fn(),
      getInstall: vi.fn(),
    } as ExternalToolsSectionProps)} />)

    fireEvent.click(await screen.findByRole('button', { name: en['external.action.connect'] }))
    await waitFor(() => { expect(setExternalTool).toHaveBeenCalledWith('codex', true) })
    expect(await screen.findByText(en['external.preset.ready'])).toBeTruthy()
    expect(screen.getByRole('button', { name: en['external.action.disconnect'] })).toBeTruthy()
  })

  it('presents the official DeepSeek Codex connector rather than the community fork', async () => {
    render(<ExternalToolsSection {...({
      t,
      list: async () => inventory,
      externalTools: async () => ({ scope: 'complete-presets', codex: false, claudeCode: false }),
      setExternalTool: vi.fn(),
      startInstall: vi.fn(),
      getInstall: vi.fn(),
    } as ExternalToolsSectionProps)} />)

    expect(await screen.findByText(en['external.codex.description'])).toBeTruthy()
    expect(en['external.codex.description']).toContain('Maintained by DeepSeek')
    expect(en['external.codex.description']).not.toContain('hecoococ')
  })

  it('installs the current official Codex and Claude Code bundle versions', async () => {
    const startInstall = vi.fn(async (request: PluginInstallRequest) => ({
      installId: `install-${String(startInstall.mock.calls.length)}`,
      profile: request.profile,
      packageSpec: request.packageSpec,
      command: 'dsh plugin add',
      phase: 'failed' as const,
      exitCode: 1,
    }))
    render(<ExternalToolsSection {...({
      t,
      list: async () => ({ ...inventory, entries: [] }),
      externalTools: async () => ({ scope: 'complete-presets', codex: false, claudeCode: false }),
      setExternalTool: vi.fn(),
      startInstall,
      getInstall: vi.fn(),
    } as ExternalToolsSectionProps)} />)

    const codexCard = (await screen.findByRole('heading', { name: 'Codex' })).closest('li')
    const claudeCard = screen.getByRole('heading', { name: 'Claude Code' }).closest('li')
    if (codexCard === null || claudeCard === null) throw new Error('expected external-tool cards')
    fireEvent.click(codexCard.querySelector('button')!)
    await waitFor(() => {
      expect(startInstall).toHaveBeenCalledWith({
        profile: 'web', packageSpec: '@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.1',
      })
    })
    fireEvent.click(claudeCard.querySelector('button')!)
    await waitFor(() => {
      expect(startInstall).toHaveBeenCalledWith({
        profile: 'web', packageSpec: '@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.1',
      })
    })
  })
})

describe('PluginDiagnosticsSection', () => {
  const diagnosticsSnapshot = {
    entries: [],
    dependencyHealth: { lastRepair: null, issues: [], quarantined: [], safeMode: null },
  } as unknown as Snapshot
  const doctorId = 'doctor-1' as PluginDoctorId
  const healthy: PluginDoctorSnapshot = {
    doctorId,
    profile: 'web',
    command: 'dsh plugin --profile web doctor',
    phase: 'healthy',
    exitCode: 0,
    report: {
      schema: 'dsh/profile-dependency-repair/v1',
      diagnosticSchema: 'dsh/profile-diagnostic/v2',
      profile: 'web',
      status: 'healthy',
      conflicts: [],
      orphanedBundles: [],
      quarantined: [],
      issues: [],
    },
  }

  const issues: PluginDoctorSnapshot = {
    ...healthy,
    phase: 'issues',
    exitCode: 2,
    report: {
      ...healthy.report!,
      status: 'failed',
      conflicts: [{
        rootPackage: 'dsh-computer-use',
        dependencyChain: ['dsh-computer-use', '@deepseek-ai/dsh-tools'],
        dependency: '@deepseek-ai/dsh-tools',
        declaredRange: '^0.1.0-rc.6',
        declaredIn: 'dependencies',
        hostVersion: '0.1.0-rc.7',
        compatible: true,
      }],
    },
  }

  it('runs the desktop Diagnostics Lab with the reviewed offline catalog', async () => {
    const startDependencyDoctor = vi.fn()
    const startUninstall = vi.fn()
    const startQuarantineRetry = vi.fn()
    const uninstallQuarantine = vi.fn()
    const scenario = {
      id: 'quarantine-removal-residue',
      title: 'Quarantine removal residue',
      description: 'Detect stale derived state after a legacy uninstall.',
      expectedCode: 'profile.quarantine-removal-residue',
      targets: ['isolated', 'active-profile'],
    } satisfies DiagnosticLabScenario
    const queued = {
      schema: 2,
      runId: 'lab-run-one',
      target: 'isolated',
      scenarioIds: [scenario.id],
      phase: 'queued',
      completedSteps: 0,
      totalSteps: 6,
      recovery: 'clean',
      startedAt: '2026-08-28T00:00:00.000Z',
      results: [],
    } satisfies DiagnosticLabRunSnapshot
    const listScenarios = vi.fn(async () => [scenario])
    const start = vi.fn(async () => queued)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor,
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall,
      startQuarantineRetry,
      uninstallQuarantine,
      dismissDependencyHealth: vi.fn(),
      diagnosticLab: {
        listScenarios,
        current: vi.fn(async () => undefined),
        start,
        getRun: vi.fn(async () => queued),
        cancel: vi.fn(async () => queued),
        restoreAll: vi.fn(async () => queued),
        exportReport: vi.fn(async () => '{}'),
        subscribe: vi.fn(() => () => {}),
      },
    } as PluginDiagnosticsSectionProps)} />)

    expect(await screen.findByRole('heading', { name: en['lab.title'] })).toBeTruthy()
    expect(listScenarios).toHaveBeenCalledOnce()
    expect(screen.getByText(en['lab.scenario.quarantineRemoval.title'])).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['lab.start'] }))
    await waitFor(() => {
      expect(start).toHaveBeenCalledWith({
        scenarioIds: ['quarantine-removal-residue'],
        target: 'isolated',
      })
    })
    expect(startDependencyDoctor).not.toHaveBeenCalled()
    expect(startUninstall).not.toHaveBeenCalled()
    expect(startQuarantineRetry).not.toHaveBeenCalled()
    expect(uninstallQuarantine).not.toHaveBeenCalled()
  })

  it('keeps a completed exercise visible until the user restores everything', async () => {
    const scenario = {
      id: 'orphaned-bundle',
      title: 'Orphaned bundle',
      description: 'Retain one real quarantine.',
      expectedCode: 'profile.orphaned-bundle',
      targets: ['isolated', 'active-profile'],
    } satisfies DiagnosticLabScenario
    const active = {
      schema: 2,
      runId: 'lab-run-retained',
      target: 'active-profile',
      scenarioIds: [scenario.id],
      phase: 'active',
      completedSteps: 6,
      totalSteps: 6,
      recovery: 'retained',
      startedAt: '2026-08-28T00:00:00.000Z',
      results: [{
        scenarioId: scenario.id,
        phase: 'passed',
        expectedCode: scenario.expectedCode,
        actualCode: scenario.expectedCode,
        repaired: true,
        retained: true,
        disposition: 'quarantined',
        durationMs: 12,
      }],
    } satisfies DiagnosticLabRunSnapshot
    const restored = { ...active, phase: 'restored', recovery: 'clean' } satisfies DiagnosticLabRunSnapshot
    const restoreAll = vi.fn(async () => restored)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
      diagnosticLab: {
        listScenarios: vi.fn(async () => [scenario]),
        current: vi.fn(async () => active),
        start: vi.fn(async () => active),
        getRun: vi.fn(async () => active),
        cancel: vi.fn(async () => active),
        restoreAll,
        exportReport: vi.fn(async () => '{}'),
        subscribe: vi.fn(() => () => {}),
      },
    } as PluginDiagnosticsSectionProps)} />)

    const restoreButton = await screen.findByRole('button', { name: en['lab.restoreAll'] })
    fireEvent.click(restoreButton)
    await waitFor(() => { expect(restoreAll).toHaveBeenCalledWith(active.runId) })
  })

  it('blocks another exercise and keeps recovery retryable after restoration fails', async () => {
    const scenario = {
      id: 'host-shadow-incompatible',
      title: 'Incompatible Host dependency',
      description: 'Retain recovery controls after a failed restore.',
      expectedCode: 'profile.host-dependency-conflict',
      targets: ['isolated', 'active-profile'],
    } satisfies DiagnosticLabScenario
    const failed = {
      schema: 2,
      runId: 'lab-run-recovery-failed',
      target: 'active-profile',
      scenarioIds: [scenario.id],
      phase: 'failed',
      completedSteps: 5,
      totalSteps: 6,
      recovery: 'failed',
      startedAt: '2026-08-31T00:00:00.000Z',
      results: [],
      diagnostic: 'dependency graph restoration could not be verified',
    } satisfies DiagnosticLabRunSnapshot
    const restored = { ...failed, phase: 'restored', recovery: 'clean' } satisfies DiagnosticLabRunSnapshot
    const restoreAll = vi.fn(async () => restored)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
      diagnosticLab: {
        listScenarios: vi.fn(async () => [scenario]),
        current: vi.fn(async () => failed),
        start: vi.fn(async () => failed),
        getRun: vi.fn(async () => failed),
        cancel: vi.fn(async () => failed),
        restoreAll,
        exportReport: vi.fn(async () => '{}'),
        subscribe: vi.fn(() => () => {}),
      },
    } as PluginDiagnosticsSectionProps)} />)

    expect(await screen.findByText(failed.diagnostic)).toBeTruthy()
    expect(screen.getByRole('button', { name: en['lab.start'] }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: en['lab.restoreAll'] }))
    await waitFor(() => { expect(restoreAll).toHaveBeenCalledWith(failed.runId) })
  })

  it('runs a current read-only check and presents the structured result', async () => {
    const startDependencyDoctor = vi.fn(async () => healthy)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor,
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    await waitFor(() => { expect(startDependencyDoctor).toHaveBeenCalledWith({ profile: 'web', repair: false }) })
    expect(await screen.findByText(en['diagnostics.healthy'])).toBeTruthy()
  })

  it('labels a retained repair as history and hides it after a healthy check', async () => {
    const retainedSnapshot = {
      entries: [],
      dependencyHealth: {
        lastRepair: { status: 'quarantined', conflicts: [] },
        issues: [],
        quarantined: [],
        safeMode: null,
      },
    } as unknown as Snapshot
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => retainedSnapshot,
      startDependencyDoctor: vi.fn(async () => healthy),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    expect(await screen.findByText(en['health.quarantined'])).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    expect(await screen.findByText(en['diagnostics.healthy'])).toBeTruthy()
    expect(screen.queryByText(en['health.quarantined'])).toBeNull()
  })

  it('shows the concrete Remote failure when a check cannot start', async () => {
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor: vi.fn(async () => { throw new Error('Remote method is unavailable') }),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(en['health.actionFailed'])
    expect(alert.textContent).toContain('Remote method is unavailable')
  })

  it('shows dependency chains and starts the guarded repair mode', async () => {
    const startDependencyDoctor = vi.fn(async (request: { repair: boolean }) => request.repair ? healthy : issues)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor,
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    expect(await screen.findByText('dsh-computer-use → @deepseek-ai/dsh-tools')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.repair'] }))
    await waitFor(() => { expect(startDependencyDoctor).toHaveBeenLastCalledWith({ profile: 'web', repair: true }) })
  })

  it('offers a focused repair for stale quarantine removal state', async () => {
    const residue = {
      ...healthy,
      phase: 'issues' as const,
      exitCode: 2,
      report: {
        ...healthy.report!,
        status: 'failed' as const,
        issues: [{
          diagnosticId: 'diagnostic-residue-1',
          code: 'profile.quarantine-removal-residue' as const,
          source: 'profile' as const,
          phase: 'preflight' as const,
          severity: 'warning' as const,
          attribution: { rootPackage: 'dsh-font' },
          actions: ['repair', 'export'] as const,
          evidence: ['repair-report', 'diagnostic-report', 'lockfile-importer'],
        }],
      },
    } satisfies PluginDoctorSnapshot
    const startDependencyDoctor = vi.fn(async (request: PluginDoctorRequest) => (
      request.repair ? healthy : residue
    ))
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor,
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    expect(await screen.findByText(en['diagnostics.issue.quarantineRemovalResidue'])).toBeTruthy()
    expect(screen.getByText('dsh-font')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.repairQuarantineRemovalResidue'] }))
    await waitFor(() => {
      expect(startDependencyDoctor).toHaveBeenLastCalledWith({ profile: 'web', repair: true })
    })
  })

  it('confirms and starts the standard removal for an active conflicting plugin', async () => {
    const removed: PluginInstallSnapshot = {
      installId: 'remove-conflict-1' as PluginInstallId,
      profile: 'web',
      packageSpec: 'dsh-computer-use',
      command: 'dsh plugin --profile web remove dsh-computer-use',
      phase: 'succeeded',
      exitCode: 0,
    }
    const startUninstall = vi.fn(async () => removed)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor: vi.fn(async () => issues),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall,
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.check'] }))
    fireEvent.click(await screen.findByRole('button', { name: en['diagnostics.uninstall.action'] }))
    const confirm = screen.getByRole('button', { name: en['diagnostics.uninstall.confirm.action'] })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: en['diagnostics.uninstall.confirm.acknowledge'] }))
    fireEvent.click(confirm)
    await waitFor(() => {
      expect(startUninstall).toHaveBeenCalledWith({ profile: 'web', packageName: 'dsh-computer-use' })
    })
    expect(await screen.findByText(en['diagnostics.uninstall.succeeded'])).toBeTruthy()
  })

  it('confirms before physically removing an inactive quarantined plugin', async () => {
    const quarantinedSnapshot = {
      entries: [],
      dependencyHealth: {
        lastRepair: null,
        issues: [],
        safeMode: null,
        quarantined: [{
          quarantineId: 'quarantine-1',
          profile: 'web',
          packageName: 'dsh-computer-use',
          packageSpec: 'dsh-computer-use@1.5.2',
          reason: 'Host dependency is incompatible',
          conflicts: [],
        }],
      },
    } as unknown as Snapshot
    const uninstallQuarantine = vi.fn(async () => true)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => quarantinedSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine,
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(await screen.findByRole('button', { name: en['health.uninstall'] }))
    expect(uninstallQuarantine).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: en['health.uninstall.confirm.action'] })
    fireEvent.click(screen.getByRole('checkbox', { name: en['health.uninstall.confirm.acknowledge'] }))
    fireEvent.click(confirm)
    await waitFor(() => { expect(uninstallQuarantine).toHaveBeenCalledWith({ quarantineId: 'quarantine-1' }) })
  })

  it.each([
    'client-module-unavailable',
    'loader-module-unresolvable',
  ] as const)('removes a %s plugin before opening its market update', async (reason) => {
    const quarantinedSnapshot = {
      entries: [],
      dependencyHealth: {
        lastRepair: null,
        issues: [],
        safeMode: null,
        quarantined: [{
          quarantineId: 'quarantine-task-board',
          profile: 'web',
          packageName: '@linxin666/dsh-client-ui-task-board',
          packageSpec: '^0.3.6',
          installedVersion: '0.3.6',
          quarantinedAt: '2026-08-31T08:00:00.000Z',
          reason,
          conflicts: [],
        }],
      },
    } as unknown as Snapshot
    const startQuarantineRetry = vi.fn()
    const uninstallQuarantine = vi.fn(async () => true)
    const openPluginMarket = vi.fn()
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => quarantinedSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry,
      uninstallQuarantine,
      dismissDependencyHealth: vi.fn(),
      openPluginMarket,
    } as PluginDiagnosticsSectionProps)} />)

    expect((await screen.findAllByText(en[`health.quarantine.solution.${reason}`])).length).toBe(2)
    expect(screen.getByText('0.3.6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['health.quarantine.action.findUpdate'] }))
    expect(screen.getByRole('heading', { name: en['health.update.confirm.title'] })).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: en['health.update.confirm.acknowledge'] }))
    fireEvent.click(screen.getByRole('button', { name: en['health.update.confirm.action'] }))

    await waitFor(() => {
      expect(uninstallQuarantine).toHaveBeenCalledWith({ quarantineId: 'quarantine-task-board' })
      expect(openPluginMarket).toHaveBeenCalledWith('@linxin666/dsh-client-ui-task-board')
    })
    expect(startQuarantineRetry).not.toHaveBeenCalled()
  })

  it('offers dependency convergence as the direct repair for a convergence quarantine', async () => {
    const quarantinedSnapshot = {
      entries: [],
      dependencyHealth: {
        lastRepair: null,
        issues: [],
        safeMode: null,
        quarantined: [{
          quarantineId: 'quarantine-convergence',
          profile: 'web',
          packageName: 'fixture-plugin',
          packageSpec: '^1.2.0',
          installedVersion: '1.2.3',
          quarantinedAt: '2026-08-31T08:00:00.000Z',
          reason: 'convergence-failed',
          conflicts: [],
        }],
      },
    } as unknown as Snapshot
    const running = {
      installId: 'retry-convergence' as PluginInstallId,
      profile: 'web',
      packageSpec: '^1.2.0',
      command: 'dsh plugin --profile web doctor --retry quarantine-convergence',
      phase: 'running',
    } satisfies PluginInstallSnapshot
    const startQuarantineRetry = vi.fn(async () => running)
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => quarantinedSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(async () => running),
      startUninstall: vi.fn(),
      startQuarantineRetry,
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
      openPluginMarket: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    expect((await screen.findAllByText(en['health.quarantine.solution.convergence-failed'])).length).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: en['health.quarantine.action.convergeRetry'] }))
    await waitFor(() => {
      expect(startQuarantineRetry).toHaveBeenCalledWith({ quarantineId: 'quarantine-convergence' })
    })
  })

  it('reports enabled Loader entries whose root Fiber failed', async () => {
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => SNAPSHOT,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    expect(await screen.findByText(en['diagnostics.runtimeIssues'])).toBeTruthy()
    expect(screen.getByText('@fixture/failed-name')).toBeTruthy()
    expect(screen.getByText(en['diagnostics.runtimeDescription'])).toBeTruthy()
  })

  it('downloads the structured redacted diagnostic export on demand', async () => {
    const createObjectURL = vi.fn(() => 'blob:dsh-diagnostics')
    const revokeObjectURL = vi.fn()
    const OriginalURL = URL
    class DiagnosticURL extends OriginalURL {
      static override createObjectURL = createObjectURL
      static override revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', DiagnosticURL)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const exportDiagnostics = vi.fn(async () => '{"schema":"dsh/profile-diagnostic-export/v1"}\n')
    render(<PluginDiagnosticsSection {...({
      t,
      list: async () => diagnosticsSnapshot,
      startDependencyDoctor: vi.fn(),
      getDependencyDoctor: vi.fn(),
      getInstall: vi.fn(),
      startUninstall: vi.fn(),
      startQuarantineRetry: vi.fn(),
      approveQuarantineBuild: vi.fn(),
      approveDiagnosticBuild: vi.fn(),
      exportDiagnostics,
      uninstallQuarantine: vi.fn(),
      dismissDependencyHealth: vi.fn(),
    } as PluginDiagnosticsSectionProps)} />)

    fireEvent.click(screen.getByRole('button', { name: en['diagnostics.export'] }))
    await waitFor(() => { expect(exportDiagnostics).toHaveBeenCalledOnce() })
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dsh-diagnostics')
  })
})

describe('PluginDiscovery', () => {
  const installed: PluginInstallSnapshot = {
    installId: 'install-1' as PluginInstallId,
    profile: 'web',
    packageSpec: 'dshmarket',
    command: 'dsh plugin --profile web add dshmarket',
    phase: 'succeeded',
    exitCode: 0,
  }
  const startInstall = vi.fn(async (request: PluginInstallRequest) => ({
    ...installed,
    packageSpec: request.packageSpec,
    command: `dsh plugin --profile web add ${request.packageSpec}`,
  }))
  const getInstall = vi.fn(async () => installed)
  const list = vi.fn(async () => ({ entries: [{ moduleName: 'dshmarket' }], dependencyHealth: { lastRepair: null, quarantined: [] } } as never))
  const openSettings = vi.fn()
  const discoveryProps = { t, list, startInstall, getInstall, openSettings } as PluginDiscoveryProps
  const registry = {
    updated: '2026-08-29', categories: { tools: { en: 'Tools' }, ui: { en: 'UI' } },
    plugins: [{ name: 'popular-plugin', owner: 'author', url: 'https://github.com/author/popular-plugin', npm: 'popular-plugin',
      category: ['tools'], description: { en: 'A live description' }, downloads: 1234, stars: 42,
      install: 'dsh plugin --profile web add popular-plugin' },
    { name: 'ui-plugin', owner: 'designer', url: 'https://github.com/author/ui-plugin', npm: 'ui-plugin',
      category: ['ui'], description: { en: 'A UI plugin' }, downloads: 900, stars: 30,
      install: 'dsh plugin --profile web add ui-plugin' }],
  }
  const requestUrl = (input: RequestInfo | URL): string => typeof input === 'string'
    ? input
    : input instanceof URL ? input.href : input.url
  const previewFetch = vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(
    requestUrl(input).endsWith('/dsh-market/registry') ? { registry } : { installed: {}, activation: {} },
  ), { status: 200 }))

  it('loads live market data, switches categories locally, and opens the plugin in Market', async () => {
    vi.stubGlobal('fetch', previewFetch)
    render(<PluginDiscovery {...discoveryProps} />)
    const trigger = screen.getByRole('button', { name: en['discovery.trigger'] })
    expect(trigger.textContent).not.toContain('5')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText(en['discovery.loadingShort'])).toBeTruthy()
    expect(await screen.findByText('popular-plugin')).toBeTruthy()
    await waitFor(() => { expect(trigger.getAttribute('aria-busy')).toBe('false') })
    expect(screen.queryByText(en['discovery.loadingShort'])).toBeNull()
    expect(screen.getByText('★ 42')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'UI' }))
    expect(screen.getByText('ui-plugin')).toBeTruthy()
    expect(previewFetch).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.goView'] }))
    expect(openSettings).toHaveBeenCalledWith('market', 'discover:ui-plugin')
  })

  it('expands the fixed category area and collapses it when results scroll upward', async () => {
    vi.stubGlobal('fetch', previewFetch)
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText('popular-plugin')).toBeTruthy()

    const expand = screen.getByRole('button', { name: en['discovery.categories.expand'] })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(screen.getByRole('button', { name: en['discovery.categories.collapse'] }).getAttribute('aria-expanded')).toBe('true')

    const results = screen.getByLabelText(en['discovery.results'])
    results.scrollTop = 120
    fireEvent.scroll(results)
    results.scrollTop = 60
    fireEvent.scroll(results)
    expect(screen.getByRole('button', { name: en['discovery.categories.expand'] }).getAttribute('aria-expanded')).toBe('false')
  })

  it('installs an npm-backed recommendation through the guarded installer after confirmation', async () => {
    vi.stubGlobal('fetch', previewFetch)
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText('popular-plugin')).toBeTruthy()

    const installButton = screen.getAllByRole('button', { name: en['discovery.install.action'] }).at(0)
    if (installButton === undefined) throw new Error('expected an install button')
    fireEvent.click(installButton)
    const confirm = screen.getByRole('button', { name: en['discovery.confirm.install'] })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: en['discovery.confirm.acknowledge'] }))
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(startInstall).toHaveBeenCalledWith({ profile: 'web', packageSpec: 'popular-plugin' })
    })
    expect(await screen.findByRole('button', { name: en['discovery.install.installed'] })).toBeTruthy()
  })

  it('reuses a fresh catalog for 24 hours while refreshing installed state on every open', async () => {
    vi.stubGlobal('fetch', previewFetch)
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText('popular-plugin')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['discovery.close'] }))
    const cachedTrigger = screen.getByRole('button', { name: en['discovery.trigger'] })
    fireEvent.click(cachedTrigger)
    expect(cachedTrigger.getAttribute('aria-busy')).toBe('true')
    expect(await screen.findByText('popular-plugin')).toBeTruthy()
    await waitFor(() => { expect(cachedTrigger.getAttribute('aria-busy')).toBe('false') })

    const paths = previewFetch.mock.calls.map(([input]) => requestUrl(input))
    expect(paths.filter(path => path.endsWith('/dsh-market/registry'))).toHaveLength(1)
    expect(paths.filter(path => path.endsWith('/dsh-market/installed'))).toHaveLength(2)
  })

  it('forces a catalog request when the user refreshes', async () => {
    vi.stubGlobal('fetch', previewFetch)
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText('popular-plugin')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['discovery.refresh'] }))
    expect(screen.getByText(en['discovery.loadingShort'])).toBeTruthy()
    await waitFor(() => {
      expect(previewFetch.mock.calls.filter(([input]) => requestUrl(input).endsWith('/dsh-market/registry'))).toHaveLength(2)
    })
  })

  it('keeps an expired ranking with a warning when refresh fails', async () => {
    const old = buildPluginDiscoveryCatalog(registry, Date.now() - 25 * 60 * 60 * 1_000)
    writePluginDiscoveryCache(old)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => requestUrl(input).endsWith('/dsh-market/installed')
      ? new Response(JSON.stringify({ installed: {}, activation: {} }), { status: 200 })
      : new Response(JSON.stringify({ error: 'offline' }), { status: 502 })))
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText('popular-plugin')).toBeTruthy()
    expect(await screen.findByText(en['discovery.cache.stale'])).toBeTruthy()
  })

  it('identifies an installed old market instead of calling it missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    expect(await screen.findByText(en['discovery.outdated.title'])).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en['discovery.updateMarket'] }))
    await waitFor(() => { expect(startInstall).toHaveBeenCalledWith({ profile: 'web', packageSpec: 'dshmarket' }) })
  })

  it('installs a missing market only after the user asks', async () => {
    list.mockResolvedValueOnce({ entries: [], dependencyHealth: { lastRepair: null, quarantined: [] } } as never)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    render(<PluginDiscovery {...discoveryProps} />)
    fireEvent.click(screen.getByRole('button', { name: en['discovery.trigger'] }))
    fireEvent.click(await screen.findByRole('button', { name: en['discovery.installMarket'] }))
    await waitFor(() => { expect(startInstall).toHaveBeenCalledWith({ profile: 'web', packageSpec: 'dshmarket' }) })
  })
})
