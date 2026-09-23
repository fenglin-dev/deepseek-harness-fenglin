import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '../../..')
const contractPath = join(import.meta.dirname, 'packaged-resource-contract.json')
const contract = JSON.parse(await readFile(contractPath, 'utf8'))

test('every desktop builder config satisfies the packaged resource contract', async () => {
  assert.equal(contract.schema, 'open-deepseek-harness-desktop/packaged-resource-contract/v1')
  for (const source of contract.staticSourceFiles) await access(join(root, source))

  for (const [platform, platformContract] of Object.entries(contract.platforms)) {
    const config = parse(await readFile(join(root, platformContract.config), 'utf8'))
    assert.deepEqual(config.files, contract.asarFiles, `${platform} asar files diverged from the contract`)
    assert.deepEqual(
      config.extraResources,
      [...contract.commonResources, ...platformContract.resources],
      `${platform} packaged resource mappings diverged from the contract`,
    )
  }
})

test('the contract is colocated with its static source roots', () => {
  assert.equal(dirname(contractPath), join(root, 'apps/desktop/scripts'))
})
