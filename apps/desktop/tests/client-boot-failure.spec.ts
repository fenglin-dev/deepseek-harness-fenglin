import { describe, expect, it } from 'vitest'
import { parseClientBootFailure } from '../src/client-boot-failure.ts'

describe('desktop client boot failure bridge', () => {
  it('classifies a duplicate community locale without blaming the desktop shell package', () => {
    expect(parseClientBootFailure({
      message: 'failed to apply loader entry f1273535 (@deepseek-ai/dsh-client-ui-desktop-shell): locale "es" is already registered',
    })).toEqual({
      diagnosticCode: 'loader.duplicate-registration',
      nativeCode: 'LOCALE_ALREADY_REGISTERED',
      moduleName: 'locale:es',
      evidence: 'Client plugin activation found duplicate locale registration: es.',
    })
  })

  it('classifies other client activation failures without accepting an unbounded payload', () => {
    expect(parseClientBootFailure({ message: 'plugin activation exploded' })).toEqual({
      diagnosticCode: 'loader.lifecycle-failed',
      nativeCode: 'CLIENT_PLUGIN_BOOT_FAILED',
      evidence: 'Client plugin tree failed before desktop readiness: plugin activation exploded',
    })
    expect(parseClientBootFailure({ message: 'x'.repeat(2_001) })).toBeUndefined()
  })

  it('rejects malformed renderer payloads', () => {
    expect(parseClientBootFailure(undefined)).toBeUndefined()
    expect(parseClientBootFailure({ message: '' })).toBeUndefined()
    expect(parseClientBootFailure({ message: 1 })).toBeUndefined()
  })
})
