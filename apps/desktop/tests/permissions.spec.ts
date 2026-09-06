import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import {
  harnessPermissionDecisionKeys,
  harnessPermissionName,
  isPromptableHarnessPermission,
  isSilentHarnessPermission,
  isTrustedHarnessPermissionRequest,
} from '../src/permissions.ts'

const TRUSTED_ORIGIN = 'http://127.0.0.1:64174'

describe('desktop renderer permission policy', () => {
  it('allows sanitized clipboard writes from the supervised main frame', () => {
    expect(isTrustedHarnessPermissionRequest(
      'clipboard-sanitized-write',
      `${TRUSTED_ORIGIN}/sessions/1`,
      TRUSTED_ORIGIN,
      true,
    )).toBe(true)
  })

  it.each([
    ['unknown', `${TRUSTED_ORIGIN}/`, TRUSTED_ORIGIN, true],
    ['openExternal', `${TRUSTED_ORIGIN}/`, TRUSTED_ORIGIN, true],
    ['clipboard-sanitized-write', `${TRUSTED_ORIGIN}/`, TRUSTED_ORIGIN, false],
    ['clipboard-sanitized-write', 'http://127.0.0.1:64175/', TRUSTED_ORIGIN, true],
    ['clipboard-sanitized-write', 'file:///tmp/loading.html', TRUSTED_ORIGIN, true],
    ['clipboard-sanitized-write', 'not a url', TRUSTED_ORIGIN, true],
    ['clipboard-sanitized-write', undefined, TRUSTED_ORIGIN, true],
    ['clipboard-sanitized-write', `${TRUSTED_ORIGIN}/`, undefined, true],
  ])('denies permission %s outside the supervised Harness boundary', (
    permission,
    requestingUrl,
    trustedOrigin,
    isMainFrame,
  ) => {
    expect(isTrustedHarnessPermissionRequest(
      permission,
      requestingUrl,
      trustedOrigin,
      isMainFrame,
    )).toBe(false)
  })

  it.each([
    'clipboard-read', 'geolocation', 'notifications', 'media', 'display-capture',
    'usb', 'serial', 'hid', 'fileSystem', 'local-network', 'web-printing', 'system-wake-lock',
    'screen-wake-lock', 'persistent-storage', 'sensors', 'smart-card',
  ])('admits trusted %s requests to the consent flow', (permission) => {
    expect(isPromptableHarnessPermission(permission)).toBe(true)
    expect(isTrustedHarnessPermissionRequest(
      permission,
      `${TRUSTED_ORIGIN}/sessions/1`,
      TRUSTED_ORIGIN,
      true,
    )).toBe(true)
  })

  it('allows the Chromium file-system check exception only at the trusted origin', () => {
    expect(isTrustedHarnessPermissionRequest('fileSystem', `${TRUSTED_ORIGIN}/`, TRUSTED_ORIGIN, false)).toBe(true)
    expect(isTrustedHarnessPermissionRequest('fileSystem', 'https://example.com/', TRUSTED_ORIGIN, false)).toBe(false)
  })

  it('keeps sanitized clipboard writes silent and unknown capabilities closed', () => {
    expect(isSilentHarnessPermission('clipboard-sanitized-write')).toBe(true)
    expect(isPromptableHarnessPermission('clipboard-sanitized-write')).toBe(false)
    expect(isPromptableHarnessPermission('unknown')).toBe(false)
  })

  it('separates microphone and camera grants', () => {
    expect(harnessPermissionDecisionKeys('media', { mediaTypes: ['audio'] })).toEqual(['media:audio'])
    expect(harnessPermissionDecisionKeys('media', { mediaTypes: ['video'] })).toEqual(['media:video'])
    expect(harnessPermissionDecisionKeys('media', { mediaTypes: ['video', 'audio', 'audio'] })).toEqual([
      'media:audio', 'media:video',
    ])
    expect(harnessPermissionDecisionKeys('media', {})).toEqual(['media:audio', 'media:video'])
  })

  it('describes media consent without collapsing camera into microphone access', () => {
    expect(harnessPermissionName('media', { mediaTypes: ['audio'] }, 'zh')).toBe('使用麦克风')
    expect(harnessPermissionName('media', { mediaTypes: ['video'] }, 'en')).toBe('use the camera')
    expect(harnessPermissionName('notifications', {}, 'zh')).toBe('发送系统通知')
  })

  it('ships macOS purpose strings for permissions that require operating-system consent', () => {
    const config = parse(readFileSync(resolve(import.meta.dirname, '../electron-builder.macos.yml'), 'utf8')) as {
      mac?: { extendInfo?: Record<string, unknown> }
    }
    expect(config.mac?.extendInfo).toMatchObject({
      NSMicrophoneUsageDescription: expect.any(String) as string,
      NSCameraUsageDescription: expect.any(String) as string,
      NSLocationWhenInUseUsageDescription: expect.any(String) as string,
    })
  })
})
