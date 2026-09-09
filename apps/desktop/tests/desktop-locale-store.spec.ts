import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDesktopLocaleStore } from '../src/desktop-locale-store.ts'

const temporaryDirectories: string[] = []

function temporaryFile(): string {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-desktop-locale-'))
  temporaryDirectories.push(directory)
  return join(directory, 'state', 'desktop-locale.json')
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('desktop locale store', () => {
  it('falls back to the current system locale when the cache is absent or malformed', () => {
    const file = temporaryFile()
    const store = createDesktopLocaleStore(file)
    expect(store.read('ja-JP')).toBe('ja')
    store.write('en')
    writeFileSync(file, '{broken', 'utf8')
    expect(store.read('fr-FR')).toBe('fr')
  })

  it('normalizes and atomically persists only the supported locale id', () => {
    const file = temporaryFile()
    const store = createDesktopLocaleStore(file)
    store.write('pt_PT')
    expect(store.read('en-US')).toBe('pt-BR')
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ version: 1, locale: 'pt-BR' })
  })

  it('falls back to English for an unsupported cached locale', () => {
    const file = temporaryFile()
    const store = createDesktopLocaleStore(file)
    store.write('unsupported')
    expect(store.read('zh-CN')).toBe('en')
  })
})
