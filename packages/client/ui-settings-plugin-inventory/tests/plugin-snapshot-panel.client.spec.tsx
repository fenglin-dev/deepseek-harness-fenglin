// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginSnapshotPanel } from '../src/client/PluginSnapshotPanel.tsx'
import { en, type PluginInventoryLocaleKey } from '../src/client/locales.ts'
import type { PluginSnapshotSummary } from '../src/client/plugin-snapshot-bridge.ts'

const t = (key: PluginInventoryLocaleKey): string => en[key]
const BOOTABLE_ID = '11111111-1111-4111-8111-111111111111'

function bootable(): PluginSnapshotSummary {
  return {
    snapshotId: BOOTABLE_ID,
    kind: 'bootable',
    trigger: 'successful-startup',
    createdAt: '2026-09-01T00:00:00.000Z',
    offlineState: 'best-effort',
    difference: {
      added: ['current-only'],
      removed: ['snapshot-only'],
      changed: ['alpha'],
      versionChanges: [{
        name: 'alpha', currentVersion: '2.0.0', snapshotVersion: '1.0.0', direction: 'downgrade',
      }],
    },
  }
}

function automatic(index: number): PluginSnapshotSummary {
  return {
    ...bootable(),
    snapshotId: `0000000${index}-0000-4000-8000-00000000000${index}`,
    kind: 'automatic',
    trigger: 'plugin-update',
    label: `Automatic ${index}`,
    createdAt: `2026-09-0${index}T00:00:00.000Z`,
  }
}

afterEach(cleanup)

describe('PluginSnapshotPanel', () => {
  it('shows concrete restore differences and protects the last successful point', async () => {
    const remove = vi.fn(async () => [])
    render(<PluginSnapshotPanel
      t={t}
      list={async () => [bootable()]}
      create={vi.fn()}
      remove={remove}
      startRestore={vi.fn()}
      subscribe={() => () => {}}
    />)
    expect(await screen.findByText('snapshot-only')).toBeTruthy()
    expect(screen.getByText('current-only')).toBeTruthy()
    expect(screen.getByText('alpha 2.0.0 → 1.0.0')).toBeTruthy()
    expect(screen.queryByRole('button', { name: en['snapshots.remove'] })).toBeNull()
    expect(remove).not.toHaveBeenCalled()
  })

  it('creates a named point and gates restore behind explicit acknowledgement', async () => {
    const create = vi.fn(async () => ({ snapshotId: BOOTABLE_ID }))
    const startRestore = vi.fn(async () => ({
      operationId: '22222222-2222-4222-8222-222222222222',
      snapshotId: BOOTABLE_ID,
      phase: 'restoring-files' as const,
    }))
    render(<PluginSnapshotPanel
      t={t}
      list={async () => [bootable()]}
      create={create}
      remove={vi.fn(async () => [])}
      startRestore={startRestore}
      subscribe={() => () => {}}
    />)
    fireEvent.change(screen.getByRole('textbox', { name: en['snapshots.label'] }), {
      target: { value: 'Before update' },
    })
    fireEvent.click(screen.getByRole('button', { name: en['snapshots.create'] }))
    await waitFor(() => { expect(create).toHaveBeenCalledWith('Before update') })

    fireEvent.click(screen.getByRole('button', { name: en['snapshots.restore'] }))
    const confirm = screen.getByRole('button', { name: en['snapshots.confirm.action'] })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: en['snapshots.confirm.acknowledge'] }))
    fireEvent.click(confirm)
    await waitFor(() => { expect(startRestore).toHaveBeenCalledWith(BOOTABLE_ID, false) })
  })

  it('shows the latest three snapshots by default and expands or collapses the rest', async () => {
    render(<PluginSnapshotPanel
      t={t}
      list={async () => [automatic(5), automatic(4), automatic(3), automatic(2), automatic(1)]}
      create={vi.fn()}
      remove={vi.fn(async () => [])}
      startRestore={vi.fn()}
      subscribe={() => () => {}}
    />)

    expect(await screen.findByText('Automatic 5')).toBeTruthy()
    expect(screen.getByText('Automatic 4')).toBeTruthy()
    expect(screen.getByText('Automatic 3')).toBeTruthy()
    expect(screen.queryByText('Automatic 2')).toBeNull()
    expect(screen.queryByText('Automatic 1')).toBeNull()

    const expand = screen.getByRole('button', { name: en['snapshots.expand'] })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(screen.getByText('Automatic 2')).toBeTruthy()
    expect(screen.getByText('Automatic 1')).toBeTruthy()

    const collapse = screen.getByRole('button', { name: en['snapshots.collapse'] })
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(collapse)
    expect(screen.queryByText('Automatic 2')).toBeNull()
    expect(screen.queryByText('Automatic 1')).toBeNull()
  })
})
