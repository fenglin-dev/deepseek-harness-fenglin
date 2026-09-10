import { describe, expect, it, vi } from 'vitest'
import { runHarnessInvocation } from '../src/harness-invocation.ts'
import type { DesktopManagedHandle, DesktopProcessObserver } from '../src/process-observer.ts'

function fixture(done = Promise.resolve({ exitCode: 0, signal: null })) {
  const handle: DesktopManagedHandle = {
    stdin: undefined, stdout: undefined, stderr: undefined, done,
    terminate: vi.fn(), waitForExit: vi.fn(async () => true),
  }
  const runtime: DesktopProcessObserver = {
    register: vi.fn(() => 'owned'), stopAll: vi.fn(async () => undefined),
    preserve: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined), list: vi.fn(() => []),
    stopRecovered: vi.fn(async () => undefined),
    launch: vi.fn(() => ({ containment: 'process-group', handle })),
  }
  const controller = new AbortController()
  const run = (timeoutMs = 1_000) => runHarnessInvocation(
    { command: '/fixture/node', args: ['fixture'] },
    { kind: 'fixture', timeoutMs, signal: controller.signal, managedRuntime: runtime },
  )
  return { handle, runtime, controller, run }
}

describe('native managed desktop invocation', () => {
  it('does not return success before its owned range is empty', async () => {
    const f = fixture()
    let release!: (value: boolean) => void
    f.handle.waitForExit = vi.fn(() => new Promise<boolean>((resolve) => { release = resolve }))
    let settled = false
    const result = f.run().then(() => { settled = true })
    await vi.waitFor(() => { expect(f.handle.terminate).toHaveBeenCalledOnce() })
    expect(settled).toBe(false)
    release(true)
    await result
    expect(settled).toBe(true)
  })

  it('rejects a successful command when range cleanup cannot be confirmed', async () => {
    const f = fixture()
    f.handle.waitForExit = vi.fn(async () => false)
    await expect(f.run()).rejects.toThrow('cleanup remains unconfirmed')
  })

  it('cleans the range even when the command outcome rejects', async () => {
    const f = fixture(Promise.reject(new Error('runner disconnected')))
    await expect(f.run()).rejects.toThrow('runner disconnected')
    expect(f.handle.terminate).toHaveBeenCalledOnce()
    expect(f.handle.waitForExit).toHaveBeenCalledOnce()
  })

  it('cancels a pending command and still verifies cleanup', async () => {
    const f = fixture(new Promise(() => undefined))
    const operation = f.run()
    f.controller.abort()
    await expect(operation).rejects.toMatchObject({ reason: 'cancelled' })
    expect(f.handle.waitForExit).toHaveBeenCalledOnce()
  })

  it('validates cancellation and timeouts before native launch', async () => {
    const f = fixture()
    await expect(f.run(0)).rejects.toThrow('timeout must be positive')
    f.controller.abort()
    await expect(f.run()).rejects.toMatchObject({ reason: 'cancelled' })
    expect(f.runtime.launch).not.toHaveBeenCalled()
  })
})
