/** The `stat` endpoint: the same gates as `read`, answering identity and freshness without content. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { FsVersion } from '@deepseek-ai/dsh-fs'
import { agent, failureOf, openWorkspace, signal, type Harness } from './harness.ts'

let harness: Harness

beforeEach(async () => {
  harness = await openWorkspace('dsh-workspace-files-stat-')
})

afterEach(async () => {
  await harness.dispose()
})

describe('workspaceFiles.stat', () => {
  it('returns the absolute path, a version, and the byte size', async () => {
    await writeFile(join(harness.workspace, 'notes.txt'), 'hello\n', 'utf8')
    const result = await harness.endpoint().stat(agent, 'notes.txt', signal())
    expect(result.absolutePath).toBe(harness.ctx.fs.processPath(await harness.ctx.fs.resolve(join(harness.workspace, 'notes.txt'))))
    expect(result.version.length).toBeGreaterThan(0)
    expect(result.bytes).toBe(6)
  })

  it('answers with the version a read of the same file reports, and a new one after a write', async () => {
    const path = join(harness.workspace, 'notes.txt')
    await writeFile(path, 'one\n', 'utf8')
    const endpoint = harness.endpoint()
    const before = await endpoint.stat(agent, 'notes.txt', signal())
    const page = await endpoint.read(agent, 'notes.txt', {}, signal())
    expect(page.version).toBe(before.version)
    await writeFile(path, 'one\ntwo\n', 'utf8')
    const after = await endpoint.stat(agent, 'notes.txt', signal())
    expect(after.version).not.toBe(before.version)
    expect(after.bytes).toBe(8)
  })

  it('rejects under a signal the caller already aborted, before any path resolves', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(harness.endpoint().stat(agent, 'notes.txt', controller.signal)).rejects.toThrow()
  })

  it('resolves the workspace root and then the confined target under the caller\'s signal', async () => {
    await writeFile(join(harness.workspace, 'notes.txt'), 'hello\n', 'utf8')
    const fs = harness.ctx.fs
    const original = fs.resolve.bind(fs)
    const spy = vi.spyOn(fs, 'resolve').mockImplementation((path, opts) => original(path, opts))
    const controller = new AbortController()
    await harness.endpoint().stat(agent, 'notes.txt', controller.signal)
    expect(spy.mock.calls.map(([, opts]) => opts?.signal)).toEqual([controller.signal, controller.signal])
    spy.mockRestore()
  })

  it('omits bytes when the backend reports no size', async () => {
    await writeFile(join(harness.workspace, 'notes.txt'), 'hello\n', 'utf8')
    vi.spyOn(harness.ctx.fs, 'stat').mockResolvedValue({ version: FsVersion('v-sizeless'), type: 'file' })
    const result = await harness.endpoint().stat(agent, 'notes.txt', signal())
    expect(result).toEqual({ absolutePath: result.absolutePath, version: 'v-sizeless' })
  })

  it('applies the read gates: symlink, directory, outside, missing, empty', async () => {
    await writeFile(join(harness.outside, 'secret.txt'), 'no', 'utf8')
    await symlink(join(harness.outside, 'secret.txt'), join(harness.workspace, 'link.txt'))
    await mkdir(join(harness.workspace, 'src'))
    const endpoint = harness.endpoint()
    expect(await failureOf(endpoint.stat(agent, 'link.txt', signal()))).toMatchObject({
      code: 'workspace-file/not-regular-file',
      details: { kind: 'symlink' },
    })
    expect((await failureOf(endpoint.stat(agent, 'src', signal()))).details).toMatchObject({ kind: 'directory' })
    expect((await failureOf(endpoint.stat(agent, join(harness.outside, 'secret.txt'), signal()))).code)
      .toBe('workspace-file/outside-workspace')
    expect((await failureOf(endpoint.stat(agent, 'nope.txt', signal()))).code).toBe('workspace-file/not-found')
    expect((await failureOf(endpoint.stat(agent, '', signal()))).code).toBe('gateway/bad-request')
  })
})
