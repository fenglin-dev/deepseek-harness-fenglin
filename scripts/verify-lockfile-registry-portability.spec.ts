import { describe, expect, it } from 'vitest'
import { collectLockfileRegistryPortabilityViolations } from './verify-lockfile-registry-portability.ts'

describe('lockfile registry portability', () => {
  it.each([
    'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
    'https://registry.npmmirror.com/example/-/example-1.0.0.tgz',
  ])('rejects a standard registry tarball URL so configured mirrors stay interchangeable: %s', (tarball) => {
    expect(collectLockfileRegistryPortabilityViolations(`
packages:

  example@1.0.0:
    resolution: {integrity: sha512-example, tarball: ${tarball}}
`)).toEqual([
      `line 5 pins a standard npm registry tarball URL (${tarball}); retain integrity and omit tarball`,
    ])
  })

  it('accepts an integrity-only registry package', () => {
    expect(collectLockfileRegistryPortabilityViolations(`
packages:

  example@1.0.0:
    resolution: {integrity: sha512-example}
`)).toEqual([])
  })

  it('accepts a nonstandard tarball host when integrity remains pinned', () => {
    expect(collectLockfileRegistryPortabilityViolations(`
packages:

  example@1.0.0:
    resolution: {integrity: sha512-example, tarball: https://packages.example.com/example-1.0.0.tgz}
`)).toEqual([])
  })

  it('rejects a remote tarball without integrity', () => {
    expect(collectLockfileRegistryPortabilityViolations(`
packages:

  example@1.0.0:
    resolution: {tarball: https://packages.example.com/example-1.0.0.tgz}
`)).toEqual([
      'line 5 records a remote tarball without integrity',
    ])
  })
})
