import { describe, expect, it } from 'vitest'
import { de, en, es, fr, ja, ko, ptBR, ru, zh } from '../src/client/locales.ts'

const placeholders = (value: string): string[] => [...value.matchAll(/\{(\w+)\}/gu)].map(match => match[1]!).sort()

describe('selection action locale dictionaries', () => {
  it('keeps every shipped dictionary key and placeholder compatible with English', () => {
    for (const dictionary of [zh, ja, ko, es, fr, de, ptBR, ru]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(dictionary[key])).toEqual(placeholders(en[key]))
      }
    }
  })
})
