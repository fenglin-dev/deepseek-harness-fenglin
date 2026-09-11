/** Same-computer configuration copies preserve files and internal links without reinstalling packages. */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, rmdir, symlink, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { inspectProfileMutationLock } from './menu-mutation-guard.ts'

type Entry = { path: string; mode: number; signature: string } & (
  { kind: 'directory' | 'file' } | { kind: 'link'; link: string }
)

function inside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

async function digest(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function resolveDestination(path: string): Promise<string> {
  try { return await realpath(path) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const parent = dirname(path)
    if (parent === path) throw error
    return join(await resolveDestination(parent), basename(path))
  }
}

async function inventory(root: string): Promise<Entry[]> {
  const entries: Entry[] = []
  async function visit(path: string): Promise<void> {
    const full = join(root, path)
    const stat = await lstat(full)
    const mode = stat.mode & 0o777
    if (stat.isSymbolicLink()) {
      const resolved = await realpath(full)
      if (!inside(root, resolved)) throw new Error(`desktop: community copy has an external link: ${path}; provide a self-contained configuration first`)
      const target = resolved
      entries.push({ path, mode, kind: 'link', signature: target, link: relative(root, target) })
    } else if (stat.isDirectory()) {
      entries.push({ path, mode, kind: 'directory', signature: String(mode) })
      for (const name of (await readdir(full)).sort()) await visit(join(path, name))
    } else if (stat.isFile()) {
      // These are kernel/session or desktop mutation leases, not dependency lockfiles.
      if (/^sessions[\\/].+[\\/]session\.lock$/u.test(path)) return
      if (/^plugin-snapshots[\\/]v1[\\/]\.profile-plugin-mutation\.[^\\/]+\.lock$/u.test(path)) {
        const owner = JSON.parse(await readFile(full, 'utf8')) as { pid?: unknown; workerPid?: unknown } | null
        if (!owner || typeof owner.pid !== 'number' || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) {
          throw new Error(`desktop: cannot verify source plugin lock: ${path}`)
        }
        for (const pid of [owner.pid, ...(owner.workerPid === undefined ? [] : [owner.workerPid])]) {
          if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0) throw new Error(`desktop: invalid source plugin lock: ${path}`)
          try { process.kill(pid, 0) } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ESRCH') continue
            throw error
          }
          throw new Error(`desktop: source has an active plugin task: ${path}`)
        }
        return
      }
      entries.push({ path, mode, kind: 'file', signature: `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${await digest(full)}` })
    } else {
      throw new Error(`desktop: community copy contains an active socket or unsupported special file: ${path}; close the source application first`)
    }
  }
  for (const name of (await readdir(root)).sort()) await visit(name)
  return entries
}

/** Copy a stopped, self-contained home to an empty destination; refuse changing sources and external links.
 * @param source - Recognized community Harness home on this computer.
 * @param target - Empty destination outside the source.
 * @returns Copied top-level entries; no plugin restoration plan is generated.
 */
export async function copyCommunityHome(source: string, target: string): Promise<string[]> {
  const sourceRoot = await realpath(source)
  if (!(await lstat(sourceRoot)).isDirectory()) throw new Error('desktop: community source is not a directory')
  const targetRoot = join(await resolveDestination(dirname(resolve(target))), basename(resolve(target)))
  if (inside(sourceRoot, targetRoot) || inside(targetRoot, sourceRoot)) throw new Error('desktop: source and isolated Harness homes must not overlap')
  const assertTarget = async (): Promise<void> => {
    try {
      if (!(await lstat(targetRoot)).isDirectory() || (await lstat(targetRoot)).isSymbolicLink()
        || (await readdir(targetRoot)).length !== 0) throw new Error('desktop: refusing to copy into non-empty Harness home')
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  await assertTarget()
  if (inspectProfileMutationLock(sourceRoot).active) throw new Error('desktop: source configuration has an active plugin task; close the source application before copying')
  await mkdir(dirname(targetRoot), { recursive: true })
  const staging = await mkdtemp(join(dirname(targetRoot), '.community-copy-'))
  try {
    const before = await inventory(sourceRoot)
    for (const entry of before) {
      const from = join(sourceRoot, entry.path)
      const to = join(staging, entry.path)
      if (entry.kind === 'directory') await mkdir(to, { mode: 0o700 })
      else if (entry.kind === 'file') {
        await copyFile(from, to)
        await chmod(to, entry.mode)
        if ((await digest(to)) !== entry.signature.split(':').at(-1)) throw new Error(`desktop: copied file verification failed: ${entry.path}`)
      }
    }
    // Build links only after the real files exist, including pnpm's internal dependency graph.
    for (const entry of before.filter(item => item.kind === 'link')) {
      const to = join(staging, entry.path)
      const destination = join(staging, entry.link)
      const directory = (await lstat(await realpath(join(sourceRoot, entry.path)))).isDirectory()
      await symlink(process.platform === 'win32' && directory ? join(targetRoot, entry.link) : relative(dirname(to), destination), to,
        directory ? (process.platform === 'win32' ? 'junction' : 'dir') : 'file')
    }
    const after = await inventory(sourceRoot)
    if (JSON.stringify(before) !== JSON.stringify(after) || inspectProfileMutationLock(sourceRoot).active) {
      throw new Error('desktop: source configuration changed during copying; close the source application and retry')
    }
    for (const entry of before.filter(item => item.kind === 'directory').reverse()) await chmod(join(staging, entry.path), entry.mode)
    await assertTarget()
    try { await rmdir(targetRoot) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await rename(staging, targetRoot)
    return [...new Set(before.map(entry => entry.path.split(sep)[0] ?? entry.path))]
  } catch (error) {
    // Remove only the private staging tree; never traverse a staged junction into the source.
    await removeStaging(staging)
    throw error
  }
}

async function removeStaging(path: string): Promise<void> {
  const stat = await lstat(path)
  if (stat.isSymbolicLink()) {
    await unlink(path)
  } else if (stat.isDirectory()) {
    await chmod(path, 0o700)
    for (const name of await readdir(path)) await removeStaging(join(path, name))
    await rmdir(path)
  } else await rm(path)
}
