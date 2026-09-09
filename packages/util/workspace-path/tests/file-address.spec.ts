import { describe, expect, it } from 'vitest'
import { absoluteFileAddress, parseFileAddress, sessionFileAddress } from '../src/file-address.ts'

describe('file addresses', () => {
  it('round-trips a session-relative path with encoded segments', () => {
    const address = sessionFileAddress('s 1', 'w/a b#c?.txt')
    expect(address).toBe('dsh-resource://file/session/s%201/w/a%20b%23c%3F.txt')
    expect(parseFileAddress(address)).toEqual({ scope: 'session', sessionId: 's 1', path: 'w/a b#c?.txt' })
  })

  it('drops a leading ./ or / from a session-relative path and names the root with an empty path', () => {
    expect(sessionFileAddress('s', './src/a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(sessionFileAddress('s', '/src/a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(sessionFileAddress('s', 'src\\a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(sessionFileAddress('s', '')).toBe('dsh-resource://file/session/s/')
    expect(parseFileAddress('dsh-resource://file/session/s/')).toEqual({ scope: 'session', sessionId: 's', path: '' })
  })

  it('round-trips an absolute POSIX path with the leading slash dropped', () => {
    const address = absoluteFileAddress('/home/me/notes.md')
    expect(address).toBe('dsh-resource://file/absolute/home/me/notes.md')
    expect(parseFileAddress(address)).toEqual({ scope: 'absolute', path: '/home/me/notes.md' })
  })

  it('round-trips an absolute Windows drive path with backslashes normalized and the colon literal', () => {
    const address = absoluteFileAddress('C:\\w\\x.ts')
    expect(address).toBe('dsh-resource://file/absolute/C:/w/x.ts')
    expect(parseFileAddress(address)).toEqual({ scope: 'absolute', path: 'C:/w/x.ts' })
  })

  it('keeps a UNC path\'s identity in an absolute address', () => {
    const address = absoluteFileAddress('\\\\server\\share\\x.ts')
    expect(address).toBe('dsh-resource://file/absolute//server/share/x.ts')
    expect(parseFileAddress(address)).toEqual({ scope: 'absolute', path: '//server/share/x.ts' })
  })

  it('decodes either spelling of a path segment', () => {
    expect(parseFileAddress('dsh-resource://file/session/s/w/a+b.txt')?.path).toBe('w/a+b.txt')
    expect(parseFileAddress('dsh-resource://file/session/s/w/a%2Bb.txt')?.path).toBe('w/a+b.txt')
    expect(parseFileAddress('dsh-resource://file/absolute/w/a%2Bb.txt')?.path).toBe('/w/a+b.txt')
  })

  it.each([
    ['another resource type', 'dsh-resource://terminal/session/s/1'],
    ['a type spelled with another case', 'dsh-resource://File/session/s/w/x.ts'],
    ['an unknown scope', 'dsh-resource://file/shared/s/w/x'],
    ['the retired file:// grammar', 'file://sessions/s/w/x.ts'],
    ['a host-less file URL', 'file:///w/x.ts'],
    ['a session address with no path', 'dsh-resource://file/session/s'],
    ['a session address with no id', 'dsh-resource://file/session'],
    ['an absolute address with no path', 'dsh-resource://file/absolute'],
    ['an absolute address with an empty path', 'dsh-resource://file/absolute/'],
    ['a UNC marker with no host behind it', 'dsh-resource://file/absolute//'],
    ['no scope', 'dsh-resource://file'],
    ['another scheme', 'sidebar://files'],
    ['not a URL', 'notes.txt'],
    ['a malformed escape', 'dsh-resource://file/session/s/%E0%A4%A'],
  ])('rejects %s', (_, address) => {
    expect(parseFileAddress(address)).toBeUndefined()
  })
})
