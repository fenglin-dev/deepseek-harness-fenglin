/** Compatibility coverage for Node's private ESM loader API. */

import { describe, expect, it } from 'vitest'
import { moduleLoaderVersion } from '../../../../vendor/loader/src/internal.ts'

describe('Node internal loader compatibility', () => {
  it('classifies the API by capability instead of the Node major version', () => {
    expect(moduleLoaderVersion({ getModuleJobForImport() {}, resolveSync() {} })).toBe('v1')
    expect(moduleLoaderVersion({ getOrCreateModuleJob() {}, resolveSync() {} })).toBe('v2')
  })
})
