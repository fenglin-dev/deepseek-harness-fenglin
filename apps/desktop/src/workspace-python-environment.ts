/** Probe and mutate a user-selected Python interpreter without leaking pip details to callers. */

import { execFile } from 'node:child_process'
import { access, constants, realpath, stat } from 'node:fs/promises'
import { promisify } from 'node:util'

const exec = promisify(execFile)

export interface PythonEnvironmentProbe {
  readonly requestedPath: string
  readonly executable: string
  readonly implementation: 'CPython'
  readonly version: string
  readonly architecture: string
  readonly pipVersion: string
  readonly sitePackages: string
  readonly writable: boolean
  readonly packages: Readonly<Record<string, string>>
}

export interface PythonPackageChange {
  readonly name: string
  readonly installed?: string
  readonly target: string
  readonly action: 'add' | 'upgrade' | 'downgrade' | 'replace'
}

export interface PythonPackagePlan {
  readonly changes: readonly PythonPackageChange[]
  readonly requiresConfirmation: boolean
  readonly indexHost?: string
}

export interface PythonCommandResult { readonly stdout: string; readonly stderr: string }
export type PythonCommandRunner = (
  executable: string,
  args: readonly string[],
  options?: { readonly timeout?: number },
) => Promise<PythonCommandResult>

export interface PythonEnvironmentPort {
  probe(requestedPath: string): Promise<PythonEnvironmentProbe>
  plan(probe: PythonEnvironmentProbe, required: Readonly<Record<string, string>>): PythonPackagePlan
  install(
    probe: PythonEnvironmentProbe,
    required: Readonly<Record<string, string>>,
    allowPackageChanges: boolean,
  ): Promise<PythonEnvironmentProbe>
}

const runDefault: PythonCommandRunner = async (executable, args, options) => {
  const result = await exec(executable, [...args], {
    encoding: 'utf8', timeout: options?.timeout ?? 120_000,
    maxBuffer: 8 * 1024 * 1024, windowsHide: true,
  })
  return { stdout: result.stdout, stderr: result.stderr }
}

const PROBE = String.raw`
import importlib.metadata, json, os, platform, struct, sys, sysconfig
print(json.dumps({
  "implementation": platform.python_implementation(),
  "version": platform.python_version(),
  "architecture": platform.machine() or (str(struct.calcsize("P") * 8) + "bit"),
  "prefix": sys.prefix,
  "sitePackages": sysconfig.get_paths().get("purelib", ""),
  "packages": {d.metadata.get("Name", ""): d.version for d in importlib.metadata.distributions() if d.metadata.get("Name")},
}))
`

function normalizePackage(name: string): string { return name.toLowerCase().replace(/[-_.]+/gu, '-') }

function versionParts(value: string): readonly number[] {
  return value.split(/[.+-]/u).map(part => /^\d+$/u.test(part) ? Number(part) : 0)
}

function compareVersion(left: string, right: string): number {
  const a = versionParts(left); const b = versionParts(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function jsonObject(value: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`desktop: invalid ${label} response`)
  return parsed as Record<string, unknown>
}

/** Deep module for custom Python validation and direct-environment Office dependency installation. */
export class PythonEnvironment implements PythonEnvironmentPort {
  readonly #run: PythonCommandRunner

  constructor(run: PythonCommandRunner = runDefault) { this.#run = run }

  async probe(requestedPath: string): Promise<PythonEnvironmentProbe> {
    if (typeof requestedPath !== 'string' || requestedPath.trim() === '') throw new TypeError('desktop: Python path is required')
    const executable = await realpath(requestedPath)
    const descriptor = await stat(executable)
    if (!descriptor.isFile()) throw new Error('desktop: selected Python path is not a file')
    const [{ stdout }, pip] = await Promise.all([
      this.#run(executable, ['-X', 'utf8', '-I', '-B', '-c', PROBE]),
      this.#run(executable, ['-X', 'utf8', '-I', '-B', '-m', 'pip', '--version']),
    ])
    const value = jsonObject(stdout, 'Python probe')
    if (value.implementation !== 'CPython' || typeof value.version !== 'string'
      || !/^3\.(?:1[0-9]|[2-9]\d)\./u.test(value.version)
      || typeof value.architecture !== 'string' || value.packages === null
      || typeof value.packages !== 'object' || Array.isArray(value.packages)
      || typeof value.prefix !== 'string' || typeof value.sitePackages !== 'string' || value.sitePackages === '') {
      throw new Error('desktop: Python must be CPython 3.10 or newer')
    }
    const packages = Object.fromEntries(Object.entries(value.packages as Record<string, unknown>)
      .filter((entry): entry is [string, string] => entry[0] !== '' && typeof entry[1] === 'string'))
    let writable = true
    try { await access(value.prefix, constants.W_OK) } catch { writable = false }
    return {
      requestedPath, executable, implementation: 'CPython', version: value.version,
      architecture: value.architecture, pipVersion: pip.stdout.trim(), sitePackages: value.sitePackages, writable, packages,
    }
  }

  plan(probe: PythonEnvironmentProbe, required: Readonly<Record<string, string>>): PythonPackagePlan {
    const installed = new Map(Object.entries(probe.packages).map(([name, version]) => [normalizePackage(name), version]))
    const changes = Object.entries(required).flatMap(([name, target]): PythonPackageChange[] => {
      const current = installed.get(normalizePackage(name))
      if (current === target) return []
      const action = current === undefined ? 'add' : compareVersion(current, target) < 0 ? 'upgrade'
        : compareVersion(current, target) > 0 ? 'downgrade' : 'replace'
      return [{ name, ...(current === undefined ? {} : { installed: current }), target, action }]
    })
    return { changes, requiresConfirmation: changes.some(change => change.action !== 'add') }
  }

  async install(
    probe: PythonEnvironmentProbe,
    required: Readonly<Record<string, string>>,
    allowPackageChanges: boolean,
  ): Promise<PythonEnvironmentProbe> {
    if (!probe.writable) throw new Error('desktop: selected Python environment is not writable')
    const coordinates = Object.entries(required).map(([name, version]) => `${name}==${version}`)
    const dryRun = await this.#run(probe.executable, [
      '-X', 'utf8', '-I', '-B', '-m', 'pip', 'install', '--dry-run', '--quiet', '--report', '-', ...coordinates,
    ], { timeout: 5 * 60_000 })
    const report = jsonObject(dryRun.stdout, 'pip dry-run report')
    const installs = Array.isArray(report.install) ? report.install : []
    const resolved = Object.fromEntries(installs.flatMap((entry): [string, string][] => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return []
      const metadata = (entry as Record<string, unknown>).metadata
      if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return []
      const { name, version } = metadata as Record<string, unknown>
      return typeof name === 'string' && typeof version === 'string' ? [[name, version]] : []
    }))
    const plan = this.plan(probe, { ...required, ...resolved })
    if (plan.requiresConfirmation && !allowPackageChanges) {
      throw new Error('desktop: Python package changes require explicit confirmation')
    }
    if (plan.changes.length > 0) {
      await this.#run(probe.executable, [
        '-X', 'utf8', '-I', '-B', '-m', 'pip', 'install',
        ...coordinates,
      ], { timeout: 15 * 60_000 })
    }
    const next = await this.probe(probe.executable)
    if (this.plan(next, required).changes.length > 0) throw new Error('desktop: Office Python dependencies did not reach the requested versions')
    return next
  }
}
