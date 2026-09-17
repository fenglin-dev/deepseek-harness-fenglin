import { describe, expect, it } from 'vitest'
import { DESKTOP_IPC, type DesktopIpcChannel } from '../src/desktop-ipc-protocol.ts'

describe('Desktop IPC protocol', () => {
  it('assigns one exact namespaced channel to each privileged operation or publication', () => {
    const channels: readonly DesktopIpcChannel[] = Object.values(DESKTOP_IPC)
    expect(new Set(channels).size).toBe(channels.length)
    expect(channels.every(channel => channel.startsWith('dsh:desktop:')
      || channel.startsWith('dsh:menu:') || channel.startsWith('dsh:source-update:'))).toBe(true)
  })
})
