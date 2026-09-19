/** Validate and classify a framework-free client boot failure reported by preload. */

import { redactPersistentLogText } from './persistent-log.ts'
import type { RecoveryFailureSummary } from './recovery-failure.ts'

const MAX_RENDERER_MESSAGE_LENGTH = 2_000
const MAX_EVIDENCE_LENGTH = 1_200
const DUPLICATE_LOCALE = /locale\s+["']([^"'\r\n]{1,64})["']\s+is already registered/iu

function record(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Convert one bounded renderer report into the recovery page's closed vocabulary. */
export function parseClientBootFailure(value: unknown): RecoveryFailureSummary | undefined {
  if (!record(value) || typeof value.message !== 'string'
    || value.message.length === 0 || value.message.length > MAX_RENDERER_MESSAGE_LENGTH) return undefined
  const message = redactPersistentLogText(value.message.replace(/[\r\n\t]+/gu, ' ').trim())
  if (message.length === 0) return undefined
  const duplicateLocale = DUPLICATE_LOCALE.exec(message)?.[1]
  if (duplicateLocale !== undefined) {
    return {
      diagnosticCode: 'loader.duplicate-registration',
      nativeCode: 'LOCALE_ALREADY_REGISTERED',
      moduleName: `locale:${duplicateLocale}`,
      evidence: `Client plugin activation found duplicate locale registration: ${duplicateLocale}.`,
    }
  }
  return {
    diagnosticCode: 'loader.lifecycle-failed',
    nativeCode: 'CLIENT_PLUGIN_BOOT_FAILED',
    evidence: `Client plugin tree failed before desktop readiness: ${message}`.slice(0, MAX_EVIDENCE_LENGTH),
  }
}
