// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ManagedProcessesRow } from '../src/client/ManagedProcessesRow.tsx'
import type { DesktopProcessesBridge } from '../src/client/bridge.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

const t = ((key: string, params?: Record<string, string | number>) => {
  let value = (en as Record<string, string>)[key] ?? key
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replace(`{${name}}`, String(replacement))
  return value
}) as never

function fixture(): {
  bridge: DesktopProcessesBridge
  stop: ReturnType<typeof vi.fn>
  approve: ReturnType<typeof vi.fn>
  revoke: ReturnType<typeof vi.fn>
} {
  const stop = vi.fn(async () => [])
  const approve = vi.fn(async () => [{
    key: 'a'.repeat(64), pluginName: '@example/background', pluginVersion: '1.0.0',
    serviceId: 'watcher', purpose: 'Watch a selected workspace.', specFingerprint: 'b'.repeat(64),
    status: 'approved' as const, requestedAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
  }])
  const revoke = vi.fn(async () => [])
  return { stop, approve, revoke, bridge: {
    list: vi.fn(async () => [{
      schema: 'open-dsh-desktop/managed-process/v1' as const,
      id: 'task-1', label: 'Plugin package update', plugin: '@example/plugin',
      lifecycle: 'task' as const, phase: 'running' as const,
      startedAt: new Date(Date.now() - 65_000).toISOString(),
      containment: 'process-group', stoppable: true,
    }]),
    stop,
    persistentServices: vi.fn(async () => [{
      key: 'a'.repeat(64), pluginName: '@example/background', pluginVersion: '1.0.0',
      serviceId: 'watcher', purpose: 'Watch a selected workspace.', specFingerprint: 'b'.repeat(64),
      status: 'pending' as const, requestedAt: new Date().toISOString(),
    }]),
    approvePersistentService: approve,
    revokePersistentService: revoke,
    preparePluginUninstall: vi.fn(async () => ({ prepared: true as const })),
  } }
}

describe('managed process settings', () => {
  it('shows redacted ownership, runtime and containment and stops by opaque id', async () => {
    const { bridge, stop } = fixture()
    render(<ManagedProcessesRow bridge={bridge} openLog={vi.fn()} t={t} />)
    expect(await screen.findByText('@example/plugin')).toBeTruthy()
    expect(screen.getByText(/Task lifetime · Running · 1m · process-group/u)).toBeTruthy()
    expect(document.body.textContent).not.toContain('/fixture')
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    await waitFor(() => { expect(stop).toHaveBeenCalledWith('task-1') })
  })

  it('requires an explicit first approval and supports revocation', async () => {
    const { bridge, approve, revoke } = fixture()
    render(<ManagedProcessesRow bridge={bridge} openLog={vi.fn()} t={t} />)
    expect(await screen.findByText('@example/background · watcher')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Allow persistence' }))
    await waitFor(() => { expect(approve).toHaveBeenCalledWith('a'.repeat(64)) })
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    await waitFor(() => { expect(revoke).toHaveBeenCalledWith('a'.repeat(64)) })
  })
})
