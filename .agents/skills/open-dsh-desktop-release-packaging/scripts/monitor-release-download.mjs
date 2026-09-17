#!/usr/bin/env node

import { spawn } from 'node:child_process'

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

const separator = process.argv.indexOf('--')
if (separator < 0 || separator === process.argv.length - 1) {
  fail('usage: monitor-release-download.mjs --minimum-mibps <value> --warmup-seconds <value> --window-seconds <value> -- <command> [args...]')
}

const options = new Map()
for (let index = 2; index < separator; index += 2) {
  const name = process.argv[index]
  const value = process.argv[index + 1]
  if (!name?.startsWith('--') || value === undefined) fail('invalid monitor option')
  options.set(name, value)
}

const minimumMiBps = Number(options.get('--minimum-mibps'))
const warmupSeconds = Number(options.get('--warmup-seconds'))
const windowSeconds = Number(options.get('--window-seconds'))
if (!(minimumMiBps > 0) || !(warmupSeconds >= 0) || !(windowSeconds > 0)) {
  fail('download speed settings must be positive numbers')
}

const command = process.argv[separator + 1]
const args = process.argv.slice(separator + 2)
const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] })
const startedAt = Date.now()
let lowSince
let stoppedForLowSpeed = false
let sawSpeed = false
let lastSpeedAt
let settled = false

const unitMultipliers = new Map([
  ['B', 1 / 1024 / 1024],
  ['KiB', 1 / 1024],
  ['MiB', 1],
  ['GiB', 1024],
])

function inspectLine(line) {
  for (const match of line.matchAll(/DL:([0-9]+(?:\.[0-9]+)?)(B|KiB|MiB|GiB)/g)) {
    const multiplier = unitMultipliers.get(match[2])
    if (multiplier === undefined) continue
    const speedMiBps = Number(match[1]) * multiplier
    sawSpeed = true
    lastSpeedAt = Date.now()
    if ((Date.now() - startedAt) / 1000 < warmupSeconds) continue
    if (speedMiBps >= minimumMiBps) {
      lowSince = undefined
      continue
    }
    lowSince ??= Date.now()
  }
}

function observer(destination) {
  let pending = ''
  return chunk => {
    destination.write(chunk)
    const lines = `${pending}${chunk.toString('utf8')}`.split(/[\r\n]+/)
    pending = lines.pop() ?? ''
    for (const line of lines) inspectLine(line)
  }
}

child.stdout.on('data', observer(process.stdout))
child.stderr.on('data', observer(process.stderr))

const telemetryTimer = setInterval(() => {
  if (settled || stoppedForLowSpeed) return
  const now = Date.now()
  const elapsedSeconds = (now - startedAt) / 1000
  if (elapsedSeconds < warmupSeconds) return
  if ((!sawSpeed && elapsedSeconds >= warmupSeconds + windowSeconds) ||
      (lastSpeedAt !== undefined && (now - lastSpeedAt) / 1000 >= windowSeconds)) {
    stoppedForLowSpeed = true
    process.stderr.write('download speed telemetry stopped; stopping rather than bypassing the configured speed floor\n')
    child.kill('SIGINT')
    return
  }
  if (lowSince === undefined || (now - lowSince) / 1000 < windowSeconds) return
  stoppedForLowSpeed = true
  process.stderr.write(
    `download speed stayed below ${minimumMiBps.toFixed(2)} MiB/s for ${windowSeconds.toFixed(0)} seconds; stopping and preserving resumable data\n`,
  )
  child.kill('SIGINT')
}, 1000)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('error', error => {
  clearInterval(telemetryTimer)
  process.stderr.write(`failed to start download command: ${error.message}\n`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  settled = true
  clearInterval(telemetryTimer)
  if (stoppedForLowSpeed) process.exit(75)
  if (signal) {
    process.stderr.write(`download command exited from signal ${signal}\n`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
