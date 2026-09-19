import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PythonEnvironment, type PythonCommandRunner } from '../src/workspace-python-environment.ts'

function runner(packages: Record<string, string>, writable = true): PythonCommandRunner {
  return async (_executable, args) => {
    if (args.includes('--version')) return { stdout: 'pip 25.2 from /env/pip (python 3.12)', stderr: '' }
    if (args.includes('--dry-run')) return { stdout: JSON.stringify({ install: args.filter(value => value.includes('==')).map((value) => {
      const [name, version] = value.split('==')
      return { metadata: { name, version } }
    }) }), stderr: '' }
    if (args.includes('install')) {
      for (const item of args.filter(value => value.includes('=='))) {
        const [name, version] = item.split('==') as [string, string]
        packages[name] = version
      }
      return { stdout: '', stderr: '' }
    }
    return { stdout: JSON.stringify({
      implementation: 'CPython', version: '3.12.8', architecture: 'arm64',
      prefix: writable ? '/tmp' : '/System', packages,
      sitePackages: '/env/lib/python3.12/site-packages',
    }), stderr: '' }
  }
}

describe('PythonEnvironment', () => {
  it('classifies add-only and replacement plans without changing the environment', () => {
    const environment = new PythonEnvironment(runner({ pandas: '2.2.0' }))
    const probe = { requestedPath: '/python', executable: '/python', implementation: 'CPython' as const,
      version: '3.12.8', architecture: 'arm64', pipVersion: 'pip 25.2', sitePackages: '/env/site-packages', writable: true,
      packages: { pandas: '2.2.0' } }
    expect(environment.plan(probe, { pandas: '3.0.1', openpyxl: '3.1.5' })).toMatchObject({
      requiresConfirmation: true,
      changes: [{ name: 'pandas', installed: '2.2.0', target: '3.0.1', action: 'upgrade' },
        { name: 'openpyxl', target: '3.1.5', action: 'add' }],
    })
  })

  it('requires confirmation before changing an existing distribution', async () => {
    const packages = { pandas: '2.2.0' }
    const environment = new PythonEnvironment(runner(packages))
    const root = await mkdtemp(join(tmpdir(), 'dsh-python-environment-'))
    const executable = join(root, 'python3')
    await writeFile(executable, '')
    const probe = { requestedPath: executable, executable, implementation: 'CPython' as const,
      version: '3.12.8', architecture: 'arm64', pipVersion: 'pip 25.2', sitePackages: '/env/site-packages', writable: true, packages }
    await expect(environment.install(probe, { pandas: '3.0.1' }, false)).rejects.toThrow(/explicit confirmation/u)
    await expect(environment.install(probe, { pandas: '3.0.1' }, true)).resolves.toMatchObject({ packages: { pandas: '3.0.1' } })
  })
})
