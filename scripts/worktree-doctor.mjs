#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { formatWorktreeReport, inspectWorktree } from './worktree-dependencies.mjs'

function repositoryRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('worktree-doctor: current directory is not inside a Git checkout')
  return resolve(result.stdout.trim())
}

try {
  const result = inspectWorktree(repositoryRoot(process.cwd()))
  process.stdout.write(formatWorktreeReport(result))
  process.exitCode = result.issues.length === 0 ? 0 : 1
} catch (error) {
  process.stderr.write(`worktree-doctor: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
