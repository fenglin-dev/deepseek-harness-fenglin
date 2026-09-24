#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  installWithRegistryFallback,
  pnpmInstallArgs,
  pnpmInstallEnvironment,
} from './worktree-dependencies.mjs'

function repositoryRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('install-dependencies: current directory is not inside a Git checkout')
  return resolve(result.stdout.trim())
}

function configuredRegistry(pnpm, root) {
  const inherited = process.env.npm_config_registry
  if (inherited !== undefined && inherited.trim() !== '') return inherited.trim()
  const result = spawnSync(pnpm, ['config', 'get', 'registry'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'false' },
  })
  if (result.status !== 0) throw new Error('cannot read the configured pnpm registry')
  const registry = result.stdout.trim()
  return registry === '' || registry === 'undefined' ? 'https://registry.npmjs.org' : registry
}

function usage() {
  return 'Usage: node scripts/install-dependencies.mjs [--ignore-scripts] [--offline]\n'
}

try {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(usage())
    process.exit(0)
  }
  const supported = new Set(['--ignore-scripts', '--offline'])
  const unsupported = args.find(arg => !supported.has(arg))
  if (unsupported !== undefined) throw new Error(`unsupported option ${JSON.stringify(unsupported)}\n${usage()}`)

  const root = repositoryRoot(process.cwd())
  const offline = args.includes('--offline')
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const configured = configuredRegistry(pnpm, root)
  const installArgs = pnpmInstallArgs({ offline })
  if (!args.includes('--ignore-scripts')) installArgs.splice(2, 1)

  const result = installWithRegistryFallback({
    configuredRegistry: configured,
    offline,
    run(registry) {
      process.stdout.write(`install-dependencies: trying ${registry ?? 'strict offline store'}\n`)
      const child = spawnSync(pnpm, installArgs, {
        cwd: root,
        env: pnpmInstallEnvironment({ offline, registry }),
        stdio: 'inherit',
      })
      if (child.error !== undefined) throw child.error
      return child.status ?? 1
    },
  })

  if (result.status !== 0) {
    const summary = result.attempts.map(attempt => `${attempt.registry ?? 'offline'} (exit ${attempt.status})`).join(', ')
    process.stderr.write(`install-dependencies: all attempts failed: ${summary}\n`)
  } else if (result.attempts.length > 1) {
    process.stdout.write(`install-dependencies: fallback succeeded with ${result.attempts.at(-1)?.registry}\n`)
  }
  process.exitCode = result.status
} catch (error) {
  process.stderr.write(`install-dependencies: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
