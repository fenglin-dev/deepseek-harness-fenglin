#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

function usage() {
  console.error('usage: release-package-state.mjs <init|get|set|show> <state-file> [...args]')
  process.exit(2)
}

const [, , command, statePath, ...args] = process.argv
if (!command || !statePath) usage()

async function readState() {
  return JSON.parse(await readFile(statePath, 'utf8'))
}

async function writeState(state) {
  await mkdir(dirname(statePath), { recursive: true })
  const temporary = `${statePath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, statePath)
}

if (command === 'init') {
  const [version, repository, branch, sourceSha] = args
  if (!version || !repository || !branch || !sourceSha) usage()
  let state
  try {
    state = await readState()
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  if (state) {
    for (const [key, expected] of Object.entries({ version, repository, branch, sourceSha })) {
      if (state[key] !== expected) {
        throw new Error(`release state ${key} is ${JSON.stringify(state[key])}, expected ${JSON.stringify(expected)}; use --restart to archive it`)
      }
    }
  } else {
    const now = new Date().toISOString()
    state = {
      schema: 'open-deepseek-harness-desktop/package-orchestration/v1',
      version,
      repository,
      branch,
      sourceSha,
      createdAt: now,
      updatedAt: now,
      stages: {},
    }
    await writeState(state)
  }
} else if (command === 'get') {
  if (args.length !== 1) usage()
  const state = await readState()
  const value = args[0].split('.').reduce((current, key) => current?.[key], state)
  if (value !== undefined && value !== null) process.stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value))
} else if (command === 'set') {
  if (args.length === 0 || args.length % 2 !== 0) usage()
  const state = await readState()
  for (let index = 0; index < args.length; index += 2) {
    const keys = args[index].split('.')
    let target = state
    for (const key of keys.slice(0, -1)) target = target[key] ??= {}
    target[keys.at(-1)] = args[index + 1]
  }
  state.updatedAt = new Date().toISOString()
  await writeState(state)
} else if (command === 'show') {
  process.stdout.write(`${JSON.stringify(await readState(), null, 2)}\n`)
} else {
  usage()
}
