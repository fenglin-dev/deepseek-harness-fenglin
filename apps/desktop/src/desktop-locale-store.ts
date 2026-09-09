/** Durable cache for the last locale reported by the active Harness profile. */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { resolveDesktopLocale, type DesktopLocaleId } from './desktop-locale.ts'

/** Read and atomically replace one locale cache file. */
export interface DesktopLocaleStore {
  read(systemLocale: string): DesktopLocaleId
  write(locale: string): void
}

/** Create a desktop-owned locale cache. */
export function createDesktopLocaleStore(filePath: string): DesktopLocaleStore {
  return {
    read(systemLocale) {
      try {
        const value = JSON.parse(readFileSync(filePath, 'utf8')) as { version?: unknown; locale?: unknown }
        return value.version === 1 && typeof value.locale === 'string'
          ? resolveDesktopLocale(value.locale)
          : resolveDesktopLocale(systemLocale)
      } catch {
        return resolveDesktopLocale(systemLocale)
      }
    },
    write(locale) {
      const resolved = resolveDesktopLocale(locale)
      mkdirSync(dirname(filePath), { recursive: true })
      const temporaryPath = `${filePath}.${process.pid}.tmp`
      writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, locale: resolved }, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      })
      renameSync(temporaryPath, filePath)
    },
  }
}
