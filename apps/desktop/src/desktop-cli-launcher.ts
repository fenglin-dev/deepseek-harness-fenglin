/** Packaged desktop `dsh` launcher that selects the desktop-owned Harness home. */

import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const SETUP_SCHEMA = 'open-deepseek-harness-desktop/data-home-setup/v1'

interface DesktopCliSetup {
  readonly schema: typeof SETUP_SCHEMA
  readonly mode: 'fresh' | 'created' | 'imported' | 'reused' | 'existing' | 'explicit'
  readonly dshHome: string
  readonly completedAt: string
  readonly source?: string
}

/** Runtime paths supplied by an app-owned wrapper rather than the ambient shell. */
export interface DesktopCliEnvironment extends NodeJS.ProcessEnv {
  OPEN_DSH_DESKTOP_SETUP_FILE?: string
  OPEN_DSH_DESKTOP_HARNESS_BIN?: string
  DSH_PNPM_BIN?: string
}

/** Validated invocation owned by the packaged desktop runtime. */
export interface DesktopCliInvocation {
  readonly command: string
  readonly args: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}

function requiredAbsolutePath(environment: DesktopCliEnvironment, name: keyof DesktopCliEnvironment): string {
  const value = environment[name]?.trim()
  if (value === undefined || value.length === 0 || !isAbsolute(value)) {
    throw new Error(`desktop dsh: ${String(name)} must be an absolute app-managed path`)
  }
  return value
}

/** Parse the durable desktop data-home selection used by terminal invocations.
 * @param source - JSON read from the desktop setup file.
 * @returns the selected Harness home.
 */
export function parseDesktopCliSetup(source: string): string {
  let value: Partial<DesktopCliSetup>
  try {
    value = JSON.parse(source) as Partial<DesktopCliSetup>
  } catch {
    throw new Error('desktop dsh: the data-directory selection is damaged; open the desktop app to repair it')
  }
  if (value.schema !== SETUP_SCHEMA
    || !['fresh', 'created', 'imported', 'reused', 'existing', 'explicit'].includes(value.mode ?? '')
    || typeof value.dshHome !== 'string'
    || !isAbsolute(value.dshHome)
    || typeof value.completedAt !== 'string'
    || (value.source !== undefined && typeof value.source !== 'string')) {
    throw new Error('desktop dsh: the data-directory selection is invalid; open the desktop app to repair it')
  }
  return value.dshHome
}

/** Resolve a terminal invocation without consulting system Node, pnpm, or DSH_HOME.
 * @param args - User arguments following the `dsh` command.
 * @param environment - App-owned paths plus the caller environment.
 * @returns the embedded Node invocation.
 */
export async function resolveDesktopCliInvocation(
  args: readonly string[],
  environment: DesktopCliEnvironment,
): Promise<DesktopCliInvocation> {
  const setupFile = requiredAbsolutePath(environment, 'OPEN_DSH_DESKTOP_SETUP_FILE')
  const harnessBin = requiredAbsolutePath(environment, 'OPEN_DSH_DESKTOP_HARNESS_BIN')
  const pnpmBin = requiredAbsolutePath(environment, 'DSH_PNPM_BIN')
  let setupSource: string
  try {
    setupSource = await readFile(setupFile, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('desktop dsh: launch the desktop app once and choose a data directory before using this command')
    }
    throw error
  }
  try {
    await Promise.all([access(harnessBin), access(pnpmBin)])
  } catch {
    throw new Error('desktop dsh: the embedded runtime is incomplete; open the desktop app to repair or reinstall it')
  }
  const dshHome = parseDesktopCliSetup(setupSource)
  return {
    command: process.execPath,
    args: [harnessBin, ...args],
    environment: {
      ...environment,
      DSH_HOME: dshHome,
      DSH_PNPM_BIN: pnpmBin,
    },
  }
}

/** Run the packaged desktop CLI and forward its terminal lifecycle.
 * @param args - User arguments following `dsh`.
 * @param environment - App-owned launcher environment.
 * @returns the child exit code.
 */
export async function runDesktopCli(
  args: readonly string[],
  environment: DesktopCliEnvironment,
): Promise<number> {
  const invocation = await resolveDesktopCliInvocation(args, environment)
  return new Promise<number>((resolve, reject) => {
    const child = spawn(invocation.command, [...invocation.args], {
      env: invocation.environment,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code !== null) resolve(code)
      else reject(new Error(`desktop dsh: embedded Harness exited from signal ${String(signal)}`))
    })
  })
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runDesktopCli(process.argv.slice(2), process.env)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) void main()
