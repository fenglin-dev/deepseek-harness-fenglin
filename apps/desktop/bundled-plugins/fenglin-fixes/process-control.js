import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
export class DesktopProcessObserver {
  records = new Map(); closing = false
  register(pid, label) {
    if (this.closing) throw new Error('desktop: process registration is closed')
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('desktop: cannot establish process identity')
    const id = randomUUID(); const identity = { pid, started: String(pid) }
    this.records.set(id, { id, label, root: identity, identities: new Map([[String(pid), identity]]), phase: 'running' })
    return id
  }
  list() { return [...this.records.values()].map(r => ({ id: r.id, label: r.label, phase: r.phase })) }
  async stopOne(id) { this.records.delete(id) }
  async stopAll() { this.closing = true; this.records.clear() }
  recoveryJournal() { return { schema: 'open-dsh-desktop/process-recovery/v2', records: [] } }
  restoreRecoveryJournal() { return 0 }
  excludeIdentities() {}
}
export function launchDesktopManagedProcess(spec) {
  const argv = [...spec.argv]
  const child = spawn(argv[0], argv.slice(1), {
    cwd: spec.cwd,
    env: spec.env,
    stdio: [
      spec.stdio?.stdin === 'pipe' ? 'pipe' : 'ignore',
      spec.stdio?.stdout === 'pipe' ? 'pipe' : 'ignore',
      spec.stdio?.stderr === 'pipe' ? 'pipe' : 'ignore',
    ],
    windowsHide: true,
  })
  let exited = false
  let settle
  const done = new Promise(resolve => { settle = resolve })
  child.once('exit', (code, signal) => { exited = true; settle({ exitCode: code, signal }) })
  child.once('error', error => { exited = true; settle({ exitCode: -1, signal: null, error }) })
  return {
    containment: 'process-tree-fallback',
    handle: {
      rootPid: child.pid,
      pid: child.pid,
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      done,
      running: () => !exited,
      terminate() { if (!exited && child.pid) { try { child.kill() } catch {} } },
      async waitForExit() {
        if (exited) return true
        await Promise.race([done, new Promise(r => setTimeout(r, 15000))])
        return exited
      },
    },
  }
}
export default { DesktopProcessObserver, launchDesktopManagedProcess }
