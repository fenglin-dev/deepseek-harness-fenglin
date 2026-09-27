import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { comparePackageSizes, formatPackageSizes } from './compare-package-sizes.mjs'

test('reports exact bytes, MiB and like-for-like deltas without counting metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'package-size-comparison-'))
  try {
    const current = join(root, 'current')
    const baseline = join(root, 'baseline')
    await mkdir(current)
    await mkdir(baseline)
    await writeFile(join(current, 'DeepSeek-Harness-macos-arm64.dmg'), Buffer.alloc(2 * 1048576))
    await writeFile(join(current, 'DeepSeek-Harness-macos-arm64.zip'), Buffer.alloc(1048576))
    await writeFile(join(current, 'SHA256SUMS'), 'metadata')
    await writeFile(join(baseline, 'DeepSeek-Harness-macos-arm64.dmg'), Buffer.alloc(4 * 1048576))
    const report = await comparePackageSizes(current, baseline)
    assert.equal(report.totalBytes, 3 * 1048576)
    assert.equal(report.comparableBytes, 2 * 1048576)
    assert.equal(report.baselineBytes, 4 * 1048576)
    assert.match(formatPackageSizes(report), /DeepSeek-Harness-macos-arm64\.dmg \| 2097152 \| 2\.0 \| 4194304 \| -50\.0%/u)
    assert.match(formatPackageSizes(report), /DeepSeek-Harness-macos-arm64\.zip \| 1048576 \| 1\.0 \| — \| —/u)
    assert.doesNotMatch(formatPackageSizes(report), /SHA256SUMS/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects empty or missing installers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'package-size-comparison-'))
  try {
    await assert.rejects(comparePackageSizes(root), /no desktop installers/u)
    await writeFile(join(root, 'DeepSeek-Harness-windows-x64.exe'), '')
    await assert.rejects(comparePackageSizes(root), /empty or non-file installer/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
