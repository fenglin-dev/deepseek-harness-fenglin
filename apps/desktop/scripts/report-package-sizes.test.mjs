import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { reportPackageSizes } from './report-package-sizes.mjs'

test('installer sizes report exact bytes and MiB only for nonempty files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'desktop-package-size-'))
  try {
    const installer = join(root, 'Desktop.dmg')
    const empty = join(root, 'empty.zip')
    const summary = join(root, 'summary.md')
    await writeFile(installer, Buffer.alloc(1048576))
    await writeFile(empty, '')
    assert.deepEqual(await reportPackageSizes([installer], summary), [{ name: 'Desktop.dmg', bytes: 1048576 }])
    assert.match(await readFile(summary, 'utf8'), /\| Desktop\.dmg \| 1048576 \| 1\.0 \|/u)
    await assert.rejects(reportPackageSizes([installer, empty], summary), /empty or non-file installer/u)
    assert.equal((await readFile(summary, 'utf8')).match(/Desktop\.dmg/gu)?.length, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
