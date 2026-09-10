import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { describe, expect, it } from 'vitest'
import { DesktopProcessObserver } from '../src/process-control.ts'
import { createProcessInspector } from '../src/process-inspector.ts'

describe('real observed process cleanup', () => {
  it.skipIf(process.platform !== 'darwin')('reaps a detached child after its observed parent exits', async () => {
    const inspector = createProcessInspector()
    const observer = new DesktopProcessObserver(inspector)
    const parent = spawn(process.execPath, ['--input-type=module', '-e', `
      import { spawn } from 'node:child_process'
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' })
      child.once('spawn', () => console.log(child.pid))
      setInterval(() => {}, 1000)
    `], { stdio: ['ignore', 'pipe', 'ignore'] })
    let childIdentity: { pid: number; started: string } | undefined
    try {
      const [output] = await once(parent.stdout, 'data') as [Buffer]
      const childPid = Number(output.toString().trim())
      if (parent.pid === undefined) throw new Error('fixture failed to spawn')
      observer.register(parent.pid, 'fixture')
      childIdentity = observer.list()[0]?.identities.find(identity => identity.pid === childPid)
      expect(childIdentity).toBeDefined()
      const exited = once(parent, 'close')
      parent.kill('SIGTERM')
      await exited
      expect(inspector.isAlive(childIdentity!)).toBe(true)
      await observer.stopAll(200, 500)
      expect(inspector.isAlive(childIdentity!)).toBe(false)
    } finally {
      if (parent.exitCode === null && parent.signalCode === null) parent.kill('SIGKILL')
      if (childIdentity !== undefined) inspector.signalProcess(childIdentity, 'SIGKILL')
      await observer.stopAll(100, 500)
    }
  }, 10_000)
})
