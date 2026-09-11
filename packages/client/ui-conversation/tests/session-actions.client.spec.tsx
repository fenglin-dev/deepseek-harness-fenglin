// @vitest-environment jsdom
/** Conversation Header Session actions: transcript copy and persistence-backed confirmations. */

import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { ConversationHeaderMenuItemOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { zh } from '../src/client/locales.ts'
import {
  conversationTranscript, SessionActions,
} from '../src/client/skeleton/SessionActions.tsx'

const SID = 'session-actions' as SessionId
const WID = 'workspace-actions' as WorkspaceId
const t = makeTranslate(zh, commonZh)

const nodes = [
  { kind: 'user', seq: 1, time: 1, content: [{ type: 'text', text: '检查项目' }], source: null },
  {
    kind: 'assistant', seq: 2, time: 2, turn: 1, step: 1,
    blocks: [{ kind: 'text', text: '已经完成检查。' }],
  },
] as const

function snapshot(partial: typeof EMPTY_CHAT_SNAPSHOT.legacy.partial = null): ConversationSnapshot {
  const chat = { ...EMPTY_CHAT_SNAPSHOT, legacy: { ...EMPTY_CHAT_SNAPSHOT.legacy, nodes, partial } }
  return {
    views: { get: (target: string) => target === 'chat' ? chat : undefined } as unknown as ConversationSnapshot['views'],
    activeTargets: new Set(['chat']),
  }
}

function sessionSnapshot(running = false): SessionSnapshot {
  return {
    sessionId: SID, queue: [], pendingSubmissions: [], running, subagent: null,
    removed: false, openState: 'open', openError: null, hasMore: false,
    loadingOlder: false, promptError: null, blank: false, lastAgentError: null,
    promptAttempted: true, awaitingFirstTurn: false,
  }
}

function mount(running = false) {
  const conversation = createSnapshotStore(snapshot())
  const session = createSnapshotStore(sessionSnapshot(running))
  const archive = vi.fn(() => Promise.resolve())
  const clearAndRestart = vi.fn(() => Promise.resolve())
  let menuOwner: ConversationHeaderMenuItemOwnerProps | undefined
  const props = {
    sessionId: SID,
    useConversation: bindSnapshotSelector(conversation),
    useSession: bindSnapshotSelector(session),
    workspaceId: WID,
    archive,
    clearAndRestart,
    renderSlot: (_key: string, owner: ConversationHeaderMenuItemOwnerProps) => {
      menuOwner = owner
      return null
    },
    t,
  } as unknown as ComponentProps<typeof SessionActions>
  render(<SessionActions {...props} />)
  return { archive, clearAndRestart, menuOwner: () => menuOwner! }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SessionActions', () => {
  it('copies the loaded visible transcript with localized speaker labels', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mount()

    fireEvent.click(screen.getByRole('button', { name: '复制已加载对话' }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('用户:\n检查项目\n\nDeepSeek:\n已经完成检查。')
    })
    expect(screen.getByRole('button', { name: '复制成功' })).toBeTruthy()
  })

  it('requires confirmation before clearing into a new Session', async () => {
    const { clearAndRestart, archive } = mount()
    fireEvent.click(screen.getByRole('button', { name: '更多会话操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '清空并新建会话' }))

    expect(screen.getByRole('dialog', { name: '清空当前会话？' }).textContent).toContain('同一工作区')
    expect(clearAndRestart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '清空并新建' }))
    await waitFor(() => { expect(clearAndRestart).toHaveBeenCalledTimes(1) })
    expect(archive).not.toHaveBeenCalled()
  })

  it('explains retained audit logs before removing the Session', async () => {
    const { archive } = mount()
    fireEvent.click(screen.getByRole('button', { name: '更多会话操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除会话' }))

    expect(screen.getByRole('dialog', { name: '删除当前会话？' }).textContent).toContain('底层日志不会被物理删除')
    fireEvent.click(screen.getByRole('button', { name: '删除会话' }))
    await waitFor(() => { expect(archive).toHaveBeenCalledTimes(1) })
  })

  it('disables lifecycle actions while the agent is running', () => {
    mount(true)
    fireEvent.click(screen.getByRole('button', { name: '更多会话操作' }))
    expect(screen.getByRole<HTMLButtonElement>('menuitem', { name: '清空并新建会话' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('menuitem', { name: '删除会话' }).disabled).toBe(true)
  })

  it('appends registered extension rows after the official actions and dispatches them', () => {
    const selected = vi.fn()
    const b = mount()
    let unregister = () => {}
    act(() => {
      unregister = b.menuOwner().registerMenuItem({
        id: 'community-action',
        item: { id: 'community-action', label: '社区操作' },
        onSelect: selected,
      })
    })
    fireEvent.click(screen.getByRole('button', { name: '更多会话操作' }))
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      '清空并新建会话', '删除会话', '社区操作',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: '社区操作' }))
    expect(selected).toHaveBeenCalledWith('community-action')
    act(() => { unregister() })
  })

  it('rejects extension ids that could impersonate an official action', () => {
    const b = mount()
    act(() => {
      b.menuOwner().registerMenuItem({
        id: 'clear',
        item: { id: 'clear', label: '伪造清空' },
        onSelect: vi.fn(),
      })
    })
    fireEvent.click(screen.getByRole('button', { name: '更多会话操作' }))
    expect(screen.queryByRole('menuitem', { name: '伪造清空' })).toBeNull()
  })
})

describe('conversationTranscript', () => {
  it('omits private reasoning and includes the active visible response', () => {
    const source = snapshot({
      turn: 2,
      step: 1,
      blocks: [
        { kind: 'reasoning', text: 'private' },
        { kind: 'text', text: '正在处理' },
      ],
    })
    expect(conversationTranscript(source, { user: 'User', assistant: 'Agent' }))
      .toBe('User:\n检查项目\n\nAgent:\n已经完成检查。\n\nAgent:\n正在处理')
  })
})
