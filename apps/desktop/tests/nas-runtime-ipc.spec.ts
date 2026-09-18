import type { IpcMain, WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { DESKTOP_IPC } from '../src/desktop-ipc-protocol.ts'
import type { DesktopNasRuntimeAuthority } from '../src/nas-runtime-authority.ts'
import { registerNasRuntimeIpc } from '../src/nas-runtime-ipc.ts'

type Handler = (event: { sender: WebContents }, ...args: unknown[]) => unknown

function bench() {
  const handlers = new Map<string, Handler>()
  const ipc = {
    handle: (channel: string, handler: Handler) => { handlers.set(channel, handler) },
  } as unknown as IpcMain
  const execute = vi.fn((operation: { kind: string }) => Promise.resolve(operation))
  const authority = {
    status: vi.fn(() => ({ selection: { kind: 'local' }, servers: [], secureStorageAvailable: true })),
    execute,
  } as unknown as DesktopNasRuntimeAuthority
  const assertRenderer = vi.fn()
  registerNasRuntimeIpc(ipc, { authority, assertRenderer })
  const sender = {} as WebContents
  const invoke = (channel: string, ...args: unknown[]): unknown => {
    const handler = handlers.get(channel)
    if (handler === undefined) throw new Error(`Missing handler for ${channel}`)
    return handler({ sender }, ...args)
  }
  return { handlers, execute, assertRenderer, sender, invoke }
}

describe('NAS runtime IPC adapter', () => {
  it('registers the fixed channel vocabulary and maps validated selections to the authority', async () => {
    const b = bench()
    expect([...b.handlers.keys()]).toEqual([
      DESKTOP_IPC.nasGet, DESKTOP_IPC.nasDiscover, DESKTOP_IPC.nasInspect, DESKTOP_IPC.nasPair,
      DESKTOP_IPC.nasSelect, DESKTOP_IPC.nasRemove, DESKTOP_IPC.nasTest, DESKTOP_IPC.nasDevices,
      DESKTOP_IPC.nasRevokeDevice,
    ])
    await expect(b.invoke(DESKTOP_IPC.nasSelect, { kind: 'nas', serverId: 'nas-1' })).resolves.toEqual({
      kind: 'select', selection: { kind: 'nas', serverId: 'nas-1' },
    })
    expect(b.assertRenderer).toHaveBeenCalledWith(b.sender)
  })

  it('rejects unknown pairing fields before they reach the authority', async () => {
    const b = bench()
    await expect(b.invoke(DESKTOP_IPC.nasPair, {
      baseUrl: 'https://nas.example.com', code: '12345678', deviceName: 'Mac mini',
      certificateFingerprint: 'AA'.repeat(32), unexpected: true,
    })).rejects.toThrow(/invalid NAS pairing request/)
    expect(b.execute).not.toHaveBeenCalled()
  })
})
