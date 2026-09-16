// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceSnapshot, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArchivedSessionsSection, type ArchivedSessionsSectionProps } from '../src/client/ArchivedSessionsSection.tsx'
import { ArchivedSessionsAction, type ArchivedSessionsActionProps } from '../src/client/ArchivedSessionsAction.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const sid = (id: string) => id as SessionId
const wid = (id: string) => id as WorkspaceId
const summary = (id: string, title: string, updatedAt: number): SessionSummary => ({
  id: sid(id), displayTitle: title, running: false, blank: false, updatedAt,
})
const workspace = (id: string, title: string, sessionIds: string[]): WorkspaceView => ({
  workspaceId: wid(id), path: `/projects/${id}`, title, sessionIds: sessionIds.map(sid),
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
})
const sessions = (items: readonly SessionSummary[]): SessionListState => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  current: undefined,
  phase: 'ready',
  subagentsByParent: {},
  jobsBySession: {},
  currentAddress: undefined,
})
const workspaces = (items: readonly WorkspaceView[], archived: readonly string[]): WorkspaceSnapshot => ({
  items, archivedSessionIds: archived.map(sid), state: 'idle', phase: 'ready', error: null,
})
function hook<T>(value: T) {
  return function select<S>(selector: (snapshot: T) => S): S { return selector(value) }
}

function mount(overrides: Partial<ArchivedSessionsSectionProps> = {}) {
  const restoreSession = vi.fn<ArchivedSessionsSectionProps['restoreSession']>(async () => {})
  const sessionRows = [
    summary('one', 'Design notes', 20),
    summary('two', 'Release investigation', 10),
    summary('orphan', 'Ungrouped history', 5),
  ]
  const props = {
    useSessions: hook(sessions(sessionRows)),
    useWorkspaces: hook(workspaces([
      workspace('product', 'A very long product workspace name that must remain usable', ['one', 'two']),
    ], ['one', 'two', 'orphan'])),
    restoreSession,
    t: makeTranslate(zh),
    ...overrides,
  } as unknown as ArchivedSessionsSectionProps
  return { ...render(<ArchivedSessionsSection {...props} />), props, restoreSession }
}

describe('ArchivedSessionsSection', () => {
  it('groups retained Sessions and supports search and Workspace filtering', () => {
    mount()
    expect(screen.getAllByText('A very long product workspace name that must remain usable')).toHaveLength(2)
    expect(screen.getAllByText('未分组')).toHaveLength(2)
    expect(screen.getByText('Design notes')).toBeTruthy()
    expect(screen.getByText('Ungrouped history')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('搜索已归档会话…'), { target: { value: 'release' } })
    expect(screen.queryByText('Design notes')).toBeNull()
    expect(screen.getByText('Release investigation')).toBeTruthy()

    fireEvent.change(screen.getByRole('combobox', { name: '按工作区筛选' }), { target: { value: '__ungrouped__' } })
    expect(screen.getByText('没有匹配的会话')).toBeTruthy()
  })

  it('restores one Session without deleting its content', async () => {
    const b = mount()
    const row = screen.getByText('Design notes').closest('li')
    fireEvent.click(row!.querySelector('button')!)
    await waitFor(() => { expect(b.restoreSession).toHaveBeenCalledWith('one') })
  })

  it('shows an actionable error when restore fails', async () => {
    const restoreSession = vi.fn(async () => { throw new Error('offline') })
    mount({ restoreSession })
    fireEvent.click(screen.getAllByRole('button', { name: '取消归档' })[0]!)
    expect((await screen.findByRole('alert')).textContent).toBe('无法恢复会话，请检查连接后重试。')
  })

  it('explains an empty archive instead of rendering an empty list', () => {
    mount({ useWorkspaces: hook(workspaces([], [])) })
    expect(screen.getByText('没有已归档会话')).toBeTruthy()
  })
})

describe('ArchivedSessionsAction', () => {
  const actionProps = (overrides: Partial<ArchivedSessionsActionProps> = {}) => ({
    activeSectionId: 'archived-sessions',
    useWorkspaces: hook(workspaces([], ['one', 'two', 'orphan'])),
    restoreSession: vi.fn(async () => {}),
    t: makeTranslate(zh),
    ...overrides,
  } as unknown as ArchivedSessionsActionProps)

  it('renders only for the archived Sessions page and restores every Session', async () => {
    const props = actionProps()
    const { rerender } = render(<ArchivedSessionsAction {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '全部取消归档' }))
    await waitFor(() => { expect(props.restoreSession).toHaveBeenCalledTimes(3) })
    expect(vi.mocked(props.restoreSession).mock.calls.map(call => call[0])).toEqual(['one', 'two', 'orphan'])

    rerender(<ArchivedSessionsAction {...actionProps({ activeSectionId: 'general' })} />)
    expect(screen.queryByRole('button', { name: '全部取消归档' })).toBeNull()
  })

  it('disables the action when the archive is empty and reports failures', async () => {
    const empty = actionProps({ useWorkspaces: hook(workspaces([], [])) })
    const { rerender } = render(<ArchivedSessionsAction {...empty} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '全部取消归档' }).disabled).toBe(true)

    const failed = actionProps({ restoreSession: vi.fn(async () => { throw new Error('offline') }) })
    rerender(<ArchivedSessionsAction {...failed} />)
    fireEvent.click(screen.getByRole('button', { name: '全部取消归档' }))
    expect((await screen.findByRole('alert')).textContent).toBe('无法恢复会话，请检查连接后重试。')
  })
})
