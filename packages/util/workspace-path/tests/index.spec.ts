import { describe, expect, it } from 'vitest'
import {
  abbreviateHomePath, fileAddressFor, isAbsoluteWorkspacePath, resolveWorkspacePath, workspaceTitleOf,
} from '@deepseek-ai/dsh-util-workspace-path'

describe('Workspace path helpers', () => {
  it('addresses a relative or in-workspace path by session and any other absolute path by itself', () => {
    expect(fileAddressFor('s', '/w', 'src/a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(fileAddressFor('s', undefined, 'src/a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(fileAddressFor('s', '/w/', '/w/src/a.ts')).toBe('dsh-resource://file/session/s/src/a.ts')
    expect(fileAddressFor('s', '/w', '/w')).toBe('dsh-resource://file/session/s/')
    expect(fileAddressFor('s', '/w', '/work/a.ts')).toBe('dsh-resource://file/absolute/work/a.ts')
    expect(fileAddressFor('s', undefined, '/etc/hosts')).toBe('dsh-resource://file/absolute/etc/hosts')
    expect(fileAddressFor('s', 'C:\\w', 'C:\\w\\x.ts')).toBe('dsh-resource://file/session/s/x.ts')
    expect(fileAddressFor('s', 'C:\\w', 'D:\\x.ts')).toBe('dsh-resource://file/absolute/D:/x.ts')
    expect(fileAddressFor('s', undefined, '\\\\server\\share\\x.ts')).toBe('dsh-resource://file/absolute//server/share/x.ts')
    expect(fileAddressFor('s', '\\\\server\\share', '\\\\server\\share\\x.ts')).toBe('dsh-resource://file/session/s/x.ts')
  })

  it('classifies POSIX, Windows drive, and UNC paths as absolute and everything else as relative', () => {
    expect(isAbsoluteWorkspacePath('/a/b')).toBe(true)
    expect(isAbsoluteWorkspacePath('C:\\x\\a.ts')).toBe(true)
    expect(isAbsoluteWorkspacePath('C:/x/a.ts')).toBe(true)
    expect(isAbsoluteWorkspacePath('\\\\server\\share')).toBe(true)
    expect(isAbsoluteWorkspacePath('src/a.ts')).toBe(false)
    expect(isAbsoluteWorkspacePath('')).toBe(false)
  })

  it('resolves relative paths without changing absolute paths', () => {
    expect(resolveWorkspacePath('/w', 'src/a.ts')).toBe('/w/src/a.ts')
    expect(resolveWorkspacePath('/w/', '/abs/a.ts')).toBe('/abs/a.ts')
    expect(resolveWorkspacePath(undefined, 'src/a.ts')).toBe('src/a.ts')
    expect(resolveWorkspacePath('', 'src/a.ts')).toBe('src/a.ts')
    expect(resolveWorkspacePath('/w', 'C:\\x\\a.ts')).toBe('C:\\x\\a.ts')
    expect(resolveWorkspacePath('/w', '\\\\server\\share')).toBe('\\\\server\\share')
  })

  it('keeps Windows drive-root and directory joins fully qualified', () => {
    expect(resolveWorkspacePath('C:\\', 'src\\a.ts')).toBe('C:\\src\\a.ts')
    expect(resolveWorkspacePath('C:\\work\\', 'src\\a.ts')).toBe('C:\\work\\src\\a.ts')
    expect(resolveWorkspacePath('C:/work/', 'src/a.ts')).toBe('C:/work/src/a.ts')
  })

  it('abbreviates only descendants of a POSIX home', () => {
    expect(abbreviateHomePath('/Users/u', '/Users/u')).toBe('~')
    expect(abbreviateHomePath('/Users/u/', '/Users/u')).toBe('~')
    expect(abbreviateHomePath('/Users/u/Documents/project', '/Users/u')).toBe('~/Documents/project')
    expect(abbreviateHomePath('/Users/u2/a.ts', '/Users/u')).toBe('/Users/u2/a.ts')
    expect(abbreviateHomePath('/Users/u/a.ts')).toBe('/Users/u/a.ts')
    expect(abbreviateHomePath('/Users/u/a.ts', '')).toBe('/Users/u/a.ts')
    expect(abbreviateHomePath('/etc/hosts', '/')).toBe('/etc/hosts')
    expect(abbreviateHomePath('C:\\Users\\u\\project', 'C:\\Users\\u')).toBe('C:\\Users\\u\\project')
    expect(abbreviateHomePath('\\\\server\\share\\u', '\\\\server\\share\\u'))
      .toBe('\\\\server\\share\\u')
  })

  it('reads the final path segment on both path styles', () => {
    expect(workspaceTitleOf('/work/project/')).toBe('project')
    expect(workspaceTitleOf('C:\\work\\project\\')).toBe('project')
    expect(workspaceTitleOf('/')).toBe('')
  })
})
