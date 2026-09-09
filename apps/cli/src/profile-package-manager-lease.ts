/** Attach the actual pnpm Node process to its existing Profile mutation owner. */
import { lstatSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

// This preload runs before pnpm can write. It removes its capability from the
// inherited environment so dependency build scripts cannot reuse the owner.
const WORKER_PRELOAD = `
import { readFileSync, lstatSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const capability = process.env.DSH_PNPM_MUTATION_WORKER;
delete process.env.DSH_PNPM_MUTATION_WORKER;
if (capability !== undefined) {
  const { path, token, nodeOptions } = JSON.parse(capability);
  if (nodeOptions === undefined) delete process.env.NODE_OPTIONS;
  else process.env.NODE_OPTIONS = nodeOptions;
  delete process.env.DSH_PLUGIN_SNAPSHOT_LEASE_TOKEN;
  delete process.env.DSH_PLUGIN_SNAPSHOT_LEASE_OWNER_PID;
  delete process.env.DSH_PLUGIN_TRANSACTION_ORIGIN;
  delete process.env.DSH_DESKTOP_MUTATION_OWNER_PID;
  const read = () => {
    if (!lstatSync(path).isFile()) throw new Error('dsh: unsafe pnpm mutation owner');
    const owner = JSON.parse(readFileSync(path, 'utf8'));
    if (owner.token !== token) throw new Error('dsh: pnpm mutation owner changed');
    return owner;
  };
  const publish = owner => {
    const temporary = path + '.' + randomUUID() + '.tmp';
    const fd = openSync(temporary, 'wx', 0o600);
    try {
      try { writeFileSync(fd, JSON.stringify(owner) + '\\n'); fsyncSync(fd); }
      finally { closeSync(fd); }
      read();
      renameSync(temporary, path);
    } finally { rmSync(temporary, { force: true }); }
  };
  const owner = read();
  if (owner.workerPid !== undefined) {
    let alive = true;
    try { process.kill(owner.workerPid, 0); }
    catch (error) { if (error.code === 'ESRCH') alive = false; }
    if (alive) throw new Error('dsh: another pnpm worker owns this Profile');
  }
  publish({ ...owner, workerPid: process.pid });
  process.once('exit', () => {
    try {
      const current = read();
      if (current.workerPid !== process.pid) return;
      delete current.workerPid;
      publish(current);
    } catch {
      // A replaced or damaged owner must remain in place for safe recovery.
    }
  });
}
`
const WORKER_IMPORT = `--import=data:text/javascript,${encodeURIComponent(WORKER_PRELOAD).replaceAll("'", '%27')}`

/**
 * Give pnpm a one-use preload tied to the existing Profile lock, when present.
 * Read-only commands without a lock retain their original environment.
 * @param profileDir - Active Profile directory selected by the CLI.
 * @param environment - Existing package-manager environment.
 * @returns Environment registering pnpm before it mutates Profile files.
 */
export function profilePackageManagerLeaseEnvironment(
  profileDir: string,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const selectedHome = resolveDshHome(undefined, environment)
  const home = environment.DSH_PLUGIN_TRANSACTION_ORIGIN === undefined
    ? selectedHome : resolve(environment.DSH_PLUGIN_TRANSACTION_ORIGIN)
  const candidateParts = relative(home, selectedHome).split(sep)
  if (home !== selectedHome && (candidateParts.length !== 4 || candidateParts[0] !== 'plugin-transactions'
    || candidateParts[1] !== basename(profileDir) || !/^[a-f0-9-]{36}$/u.test(candidateParts[2] ?? '')
    || candidateParts[3] !== 'candidate')) throw new Error('dsh: invalid pnpm candidate home')
  const selectedEnvironment = {
    ...environment, pnpm_config_store_dir: join(home, '.pnpm-store'), npm_config_store_dir: join(home, '.pnpm-store'),
  }
  if (resolve(dirname(profileDir)) !== join(selectedHome, 'profiles')) {
    return selectedEnvironment
  }
  const lockPath = join(home, 'plugin-snapshots', 'v1', `.profile-plugin-mutation.${basename(profileDir)}.lock`)
  let source: string
  try {
    if (!lstatSync(lockPath).isFile()) throw new Error('dsh: unsafe pnpm mutation owner')
    source = readFileSync(lockPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && home === selectedHome) return selectedEnvironment
    throw error
  }
  const owner = JSON.parse(source) as { pid?: unknown; token?: unknown }
  if (typeof owner.token !== 'string' || owner.token.length === 0
    || (owner.pid !== process.pid && owner.token !== environment.DSH_PLUGIN_SNAPSHOT_LEASE_TOKEN)) {
    throw new Error('dsh: pnpm does not own the Profile mutation lock')
  }
  return {
    ...selectedEnvironment,
    NODE_OPTIONS: [environment.NODE_OPTIONS, WORKER_IMPORT].filter(Boolean).join(' '),
    DSH_PNPM_MUTATION_WORKER: JSON.stringify({ path: lockPath, token: owner.token, nodeOptions: environment.NODE_OPTIONS }),
  }
}
