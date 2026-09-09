/**
 * Stage one, as the registry sees it: the type is a page that claims no
 * address, sits in the builtin band, and offers the guide page one entry that
 * opens its kind.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { sessionFileAddress } from '@deepseek-ai/dsh-util-workspace-path'
import {
  FILES_ID, FILES_KIND, filesDefinition,
} from '../src/client/definition.ts'
import { zh } from '../src/client/locales.ts'

const t = makeTranslate(zh)

describe('filesDefinition', () => {
  it('registers under its kind and id and claims no address', () => {
    const registry = new SidebarRightTabRegistry(new Context())
    registry.register(filesDefinition(t))
    expect(registry.get(FILES_KIND)?.id).toBe(FILES_ID)
    expect(registry.candidates(sessionFileAddress('s-1', '/work/app/a.ts'))).toEqual([])
  })

  it('offers the guide page one entry at order 10 that opens the files kind', () => {
    const registry = new SidebarRightTabRegistry(new Context())
    registry.register(filesDefinition(t))
    const [entry, ...rest] = registry.guide()
    expect(rest).toEqual([])
    expect(entry?.order).toBe(10)
    expect(entry?.kind).toBe(FILES_KIND)
    expect(entry?.title()).toBe(zh['guide.title'])
    expect(entry?.description()).toBe(zh['guide.description'])
    expect(entry?.icon).toBeDefined()
  })

  it('sits in the builtin band and titles itself from the dictionary', () => {
    const definition = filesDefinition(t)
    expect(definition.priority).toBe('builtin')
    expect(definition.patterns).toBeUndefined()
    expect(definition.title('')).toBe(zh['type.label'])
  })
})
