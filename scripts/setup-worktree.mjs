#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  formatWorktreeReport,
  inspectWorktree,
  installWithRegistryFallback,
  isLinkedWorktree,
  pnpmInstallArgs,
  pnpmInstallEnvironment,
} from './worktree-dependencies.mjs'

function repositoryRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('setup-worktree: current directory is not inside a Git checkout')
  return resolve(result.stdout.trim())
}

function run(command, args, root, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  return result.status ?? 1
}

function usage() {
  return 'Usage: node scripts/setup-worktree.mjs [--offline]\n'
}

function configuredRegistry(pnpm, root) {
  const inherited = process.env.npm_config_registry
  if (inherited !== undefined && inherited.trim() !== '') return inherited.trim()
  const result = spawnSync(pnpm, ['config', 'get', 'registry'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('cannot read the configured pnpm registry')
  const registry = result.stdout.trim()
  return registry === '' || registry === 'undefined' ? 'https://registry.npmjs.org' : registry
}

try {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(usage())
    process.exit(0)
  }
  const unsupported = args.filter(arg => arg !== '--offline')
  if (unsupported.length > 0) throw new Error(`unsupported option ${JSON.stringify(unsupported[0])}\n${usage()}`)

  const root = repositoryRoot(process.cwd())
  if (!isLinkedWorktree(root)) {
    throw new Error('this command is only for a linked Git worktree; run pnpm install in the main checkout')
  }
  const offline = args.includes('--offline')
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const installArgs = pnpmInstallArgs({ offline })
  const registry = configuredRegistry(pnpm, root)
  process.stdout.write(offline
    ? 'Setting up this worktree in strict offline mode. Missing local packages or metadata will stop the install.\n'
    : 'Setting up this worktree with the local pnpm store preferred. pnpm may contact configured registries for missing data.\n')
  const installStatus = installWithRegistryFallback({
    configuredRegistry: registry,
    offline,
    run(registryCandidate) {
      process.stdout.write(`setup-worktree: trying ${registryCandidate ?? 'strict offline store'}\n`)
      return run(pnpm, installArgs, root, pnpmInstallEnvironment({ offline, registry: registryCandidate }))
    },
  }).status
  if (installStatus !== 0) {
    const hint = offline
      ? 'Offline setup could not use the existing store. Retry without --offline when network access is available.\n'
      : 'Dependency setup failed. Run node scripts/worktree-doctor.mjs for a read-only report.\n'
    process.stderr.write(hint)
    process.exit(installStatus)
  }

  const hookStatus = run(process.execPath, ['scripts/install-lefthook.mjs'], root)
  if (hookStatus !== 0) process.exit(hookStatus)
  const result = inspectWorktree(root)
  process.stdout.write(`\n${formatWorktreeReport(result)}`)
  process.exitCode = result.issues.length === 0 ? 0 : 1
} catch (error) {
  process.stderr.write(`setup-worktree: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
