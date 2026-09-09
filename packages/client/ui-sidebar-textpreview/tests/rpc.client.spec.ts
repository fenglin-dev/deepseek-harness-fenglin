/**
 * The address-to-read translation: a `dsh-resource://file/session/<id>/<path>`
 * address names the session the read runs under and the workspace-relative path
 * it hands the Host; a `dsh-resource://file/absolute/<path>` address is read
 * through the seat's own session; anything else fails loud.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createReadPage, hostFileOf } from '../src/client/rpc.ts'
import type { WorkspaceFilesReadRemote } from '../src/client/rpc.ts'
import { ADDRESS, FILE, PATH, SESSION, page } from './fixtures.client.ts'

const SEAT = 's-seat' as SessionId

describe('hostFileOf', () => {
  it('reads the session and the decoded relative path out of a session file address, whatever the seat\'s session', () => {
    expect(hostFileOf(ADDRESS, SEAT)).toEqual(FILE)
    expect(hostFileOf('dsh-resource://file/session/s%2F1/work/a%20b%23c.md', SEAT)).toEqual({ sessionId: 's/1', path: 'work/a b#c.md' })
  })

  it('reads an absolute address through the seat\'s session with the decoded absolute path', () => {
    expect(hostFileOf('dsh-resource://file/absolute/etc/hosts', SEAT)).toEqual({ sessionId: SEAT, path: '/etc/hosts' })
    expect(hostFileOf('dsh-resource://file/absolute/C:/w/a%20b.md', SEAT)).toEqual({ sessionId: SEAT, path: 'C:/w/a b.md' })
  })

  it('throws for an address that is not a file address', () => {
    for (const address of ['dsh-resource://file/shared/team/notes.md', 'dsh-resource://file/session', 'file:///work/notes.md', 'sidebar://guide']) {
      expect(() => hostFileOf(address, SEAT)).toThrow('not a file address')
    }
  })
})

describe('createReadPage', () => {
  it('binds the paged read to the Remote with the offset as the only range', async () => {
    const read = vi.fn<WorkspaceFilesReadRemote['workspaceFiles']['read']>(() => Promise.resolve(page(4, ['d'], true)))
    const signal = new AbortController().signal
    await expect(createReadPage({ workspaceFiles: { read } })(SESSION, PATH, 4, signal)).resolves.toEqual(page(4, ['d'], true))
    expect(read).toHaveBeenCalledWith(SESSION, PATH, { offset: 4 }, signal)
  })
})
