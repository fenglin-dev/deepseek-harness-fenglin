import { existsSync, globSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const WORKSPACE_STATE = 'node_modules/.pnpm-workspace-state-v1.json'

function normalizeRelative(path) {
  const normalized = path.split(sep).join('/')
  return normalized === '' ? '.' : normalized
}

/**
 * Detect whether a checkout uses Git's linked-worktree metadata file.
 * @param {string} root - repository root.
 * @returns {boolean} true for a linked worktree and false for a main checkout.
 */
export function isLinkedWorktree(root) {
  try {
    return statSync(resolve(root, '.git')).isFile()
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Read the package globs from pnpm-workspace.yaml without requiring a YAML dependency.
 * @param {string} text - pnpm-workspace.yaml contents.
 * @returns {string[]} package directory globs in declaration order.
 */
export function parseWorkspacePatterns(text) {
  const patterns = []
  let insidePackages = false
  for (const line of text.split(/\r?\n/u)) {
    if (line === 'packages:') {
      insidePackages = true
      continue
    }
    if (!insidePackages) continue
    const match = /^  - (.+)$/u.exec(line)
    if (match !== null) {
      patterns.push(match[1].replace(/^['"]|['"]$/gu, ''))
      continue
    }
    if (/^\S/u.test(line)) break
  }
  return patterns
}

/**
 * Read importer directory keys from a pnpm lockfile without loading pnpm or YAML.
 * @param {string} text - pnpm-lock.yaml contents.
 * @returns {Set<string>} normalized importer directories.
 */
export function parseLockfileImporters(text) {
  const importers = new Set()
  let insideImporters = false
  for (const line of text.split(/\r?\n/u)) {
    if (line === 'importers:') {
      insideImporters = true
      continue
    }
    if (!insideImporters) continue
    if (/^\S/u.test(line)) break
    const match = /^  ([^ ].*):$/u.exec(line)
    if (match === null) continue
    importers.add(match[1].replace(/^['"]|['"]$/gu, ''))
  }
  return importers
}

/**
 * Build the pnpm install arguments for the cache-preferred or strict-offline setup mode.
 * @param {{ offline: boolean }} options - selected setup mode.
 * @returns {string[]} arguments passed to pnpm.
 */
export function pnpmInstallArgs({ offline }) {
  const common = ['install', '--frozen-lockfile', '--ignore-scripts']
  // pnpm 11 otherwise re-fetches registry metadata while verifying an unchanged lockfile.
  return offline
    ? [...common, '--offline', '--config.trustLockfile=true']
    : [...common, '--prefer-offline']
}

/**
 * Build the process environment for a pnpm setup operation.
 * @param {{ offline: boolean }} options - selected setup mode.
 * @param {NodeJS.ProcessEnv} [base] - inherited process environment.
 * @returns {NodeJS.ProcessEnv} child-process environment.
 */
export function pnpmInstallEnvironment({ offline }, base = process.env) {
  if (!offline) return { ...base, NO_UPDATE_NOTIFIER: '1' }
  const blockedProxy = 'http://127.0.0.1:9'
  return {
    ...base,
    ALL_PROXY: blockedProxy,
    HTTP_PROXY: blockedProxy,
    HTTPS_PROXY: blockedProxy,
    all_proxy: blockedProxy,
    http_proxy: blockedProxy,
    https_proxy: blockedProxy,
    COREPACK_ENABLE_NETWORK: '0',
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost',
    NO_UPDATE_NOTIFIER: '1',
    npm_config_https_proxy: blockedProxy,
    npm_config_offline: 'true',
    npm_config_proxy: blockedProxy,
    npm_config_registry: 'http://127.0.0.1:9',
    PNPM_CONFIG_FETCH_RETRIES: '0',
    PNPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '1',
    PNPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '1',
  }
}

function packageUsesLockfile(manifest) {
  return ['dependencies', 'devDependencies', 'optionalDependencies']
    .some(key => Object.keys(manifest[key] ?? {}).length > 0)
}

function workspaceProjects(root, patterns) {
  const projects = new Map([['.', readJson(resolve(root, 'package.json'))]])
  for (const pattern of patterns) {
    for (const path of globSync(pattern, { cwd: root })) {
      const normalized = normalizeRelative(path)
      const manifestPath = resolve(root, normalized, 'package.json')
      if (existsSync(manifestPath)) projects.set(normalized, readJson(manifestPath))
    }
  }
  return projects
}

function difference(left, right) {
  return [...left].filter(value => !right.has(value)).sort()
}

function command(runner, executable, args, cwd) {
  return runner(executable, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      COREPACK_ENABLE_NETWORK: '0',
      NO_UPDATE_NOTIFIER: '1',
      npm_config_offline: 'true',
    },
  })
}

function versionParts(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(version)
  return match === null ? undefined : match.slice(1).map(Number)
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

function satisfiesComparator(version, comparator) {
  const match = /^(\^|>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/u.exec(comparator)
  if (match === null) return false
  const expected = versionParts(match[2])
  if (expected === undefined) return false
  const comparison = compareVersions(version, expected)
  switch (match[1] ?? '=') {
    case '^': return comparison >= 0 && version[0] === expected[0]
    case '>=': return comparison >= 0
    case '<=': return comparison <= 0
    case '>': return comparison > 0
    case '<': return comparison < 0
    case '=': return comparison === 0
    default: return false
  }
}

/**
 * Evaluate the comparator forms allowed by this repository's Node engine range.
 * @param {string} version - concrete Node version.
 * @param {string | undefined} range - package.json engines.node value.
 * @returns {boolean} whether the version satisfies at least one OR clause.
 */
export function nodeVersionSatisfies(version, range) {
  const parsed = versionParts(version)
  if (parsed === undefined || range === undefined) return false
  return range.split(/\s*\|\|\s*/u).some(clause => {
    const comparators = clause.trim().split(/\s+/u).filter(Boolean)
    return comparators.length > 0 && comparators.every(comparator => satisfiesComparator(parsed, comparator))
  })
}

/**
 * Inspect one checkout without changing its dependency or Git state.
 * @param {string} root - repository root.
 * @param {{ runner?: typeof spawnSync }} [options] - command runner override for tests.
 * @returns {{ issues: Array<{ code: string; detail: string }>; facts: Record<string, unknown> }} diagnostic result.
 */
export function inspectWorktree(root, options = {}) {
  const runner = options.runner ?? spawnSync
  const packageJson = readJson(resolve(root, 'package.json'))
  const workspaceText = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
  const patterns = parseWorkspacePatterns(workspaceText)
  const projects = workspaceProjects(root, patterns)
  const expectedProjects = new Set(projects.keys())
  const expectedImporters = new Set(
    [...projects].filter(([, manifest]) => packageUsesLockfile(manifest)).map(([path]) => path),
  )
  const issues = []
  const lockfilePath = resolve(root, 'pnpm-lock.yaml')
  let lockImporters = new Set()
  if (!existsSync(lockfilePath)) {
    issues.push({ code: 'lockfile-missing', detail: 'pnpm-lock.yaml is missing.' })
  } else {
    lockImporters = parseLockfileImporters(readFileSync(lockfilePath, 'utf8'))
    const missing = difference(expectedImporters, lockImporters)
    const stale = difference(lockImporters, expectedProjects)
    if (missing.length > 0) {
      issues.push({ code: 'lockfile-importers-missing', detail: `Missing lockfile importers: ${missing.join(', ')}` })
    }
    if (stale.length > 0) {
      issues.push({ code: 'lockfile-importers-stale', detail: `Stale lockfile importers: ${stale.join(', ')}` })
    }
  }

  const nodeModules = existsSync(resolve(root, 'node_modules'))
  const statePath = resolve(root, WORKSPACE_STATE)
  let stateProjects = new Set()
  if (!nodeModules) {
    issues.push({ code: 'node-modules-missing', detail: 'node_modules is missing in this checkout.' })
  }
  if (!existsSync(statePath)) {
    issues.push({ code: 'workspace-state-missing', detail: `${WORKSPACE_STATE} is missing.` })
  } else {
    try {
      const state = readJson(statePath)
      stateProjects = new Set(Object.keys(state.projects ?? {}).map(path => normalizeRelative(relative(root, path))))
      const missing = difference(expectedProjects, stateProjects)
      const stale = difference(stateProjects, expectedProjects)
      if (missing.length > 0) {
        issues.push({ code: 'workspace-links-missing', detail: `Workspace links are missing for: ${missing.join(', ')}` })
      }
      if (stale.length > 0) {
        issues.push({ code: 'workspace-links-stale', detail: `Workspace state still names: ${stale.join(', ')}` })
      }
      const omittedSelections = ['dev', 'production', 'optional']
        .filter(selection => state.settings?.[selection] === false)
      if (state.filteredInstall === true || omittedSelections.length > 0) {
        issues.push({
          code: 'workspace-selection-filtered',
          detail: `Workspace state records a filtered install${omittedSelections.length === 0 ? '' : ` without ${omittedSelections.join(', ')}`}.`,
        })
      }
    } catch (error) {
      issues.push({ code: 'workspace-state-invalid', detail: `Cannot read ${WORKSPACE_STATE}: ${error.message}` })
    }
  }

  const expectedPnpm = String(packageJson.packageManager ?? '').replace(/^pnpm@/u, '')
  const pnpmResult = command(runner, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--version'], root)
  const actualPnpm = pnpmResult.status === 0 ? pnpmResult.stdout.trim() : undefined
  if (actualPnpm === undefined) {
    issues.push({ code: 'pnpm-unavailable', detail: 'The pinned pnpm executable is not available without a download.' })
  } else if (actualPnpm !== expectedPnpm) {
    issues.push({ code: 'pnpm-version', detail: `pnpm ${actualPnpm} is active; this repository pins ${expectedPnpm}.` })
  }

  let storePath
  if (actualPnpm !== undefined) {
    const storeResult = command(
      runner,
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['store', 'path', '--silent'],
      root,
    )
    if (storeResult.status === 0) storePath = storeResult.stdout.trim()
  }

  if (!nodeVersionSatisfies(process.versions.node, packageJson.engines?.node)) {
    issues.push({ code: 'node-version', detail: `Node ${process.versions.node} does not satisfy ${packageJson.engines?.node}.` })
  }

  return {
    issues,
    facts: {
      linkedWorktree: isLinkedWorktree(root),
      node: process.versions.node,
      pnpm: actualPnpm,
      expectedPnpm,
      storePath,
      workspaceProjects: expectedProjects.size,
      lockfileImporters: lockImporters.size,
      stateProjects: stateProjects.size,
    },
  }
}

/**
 * Render a stable human-readable dependency report.
 * @param {{ issues: Array<{ code: string; detail: string }>; facts: Record<string, unknown> }} result - inspection result.
 * @returns {string} terminal report.
 */
export function formatWorktreeReport(result) {
  const lines = [
    'DeepSeek Harness worktree dependency doctor',
    `Checkout: ${result.facts.linkedWorktree ? 'linked worktree' : 'main worktree'}`,
    `Node: ${result.facts.node}`,
    `pnpm: ${result.facts.pnpm ?? 'unavailable'} (expected ${result.facts.expectedPnpm})`,
    `Workspace projects: ${result.facts.workspaceProjects}`,
    `Recorded workspace projects: ${result.facts.stateProjects}`,
    `pnpm store: ${result.facts.storePath ?? 'unavailable or not yet initialized'}`,
  ]
  if (result.issues.length === 0) {
    lines.push('', 'Status: ready')
  } else {
    lines.push('', 'Status: setup required')
    for (const issue of result.issues) lines.push(`- ${issue.code}: ${issue.detail}`)
    lines.push('', 'Repair: node scripts/setup-worktree.mjs')
    lines.push('Strict offline repair: node scripts/setup-worktree.mjs --offline')
  }
  return `${lines.join('\n')}\n`
}
