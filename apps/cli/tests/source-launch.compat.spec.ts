import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'
import { createRuntimeResolution } from '@deepseek-ai/dsh-app-boot'
import { INSTALL_ANCHOR } from '../src/install-anchor.ts'
import { testProfileResolution } from './profiles/headless/tests/profile-resolution.ts'

/**
 * Keyless source-launch and profile-resolution checks through the production
 * tsx ESM-only entry. The Node compatibility matrix runs this file without a
 * build; source tool execution with native/generated dependencies belongs to
 * the build-backed source-tool suite.
 */

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const dshSourceBin = 'apps/cli/src/bin.ts'

describe('dsh SOURCE launcher (node --import tsx/esm)', () => {
  testProfileResolution('src')

  it('resolves installation-owned modules without materializing a shared fallback', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-plugin-fallback-'))
    try {
      const profileDir = join(home, 'profiles', 'web')
      const pluginDir = join(profileDir, 'node_modules', 'fixture-ui')
      await mkdir(pluginDir, { recursive: true })
      await writeFile(join(profileDir, 'cordis.patch.yml'), '[]\n')
      await writeFile(join(profileDir, 'package.json'), JSON.stringify({
        name: 'dsh-profile-web',
        dependencies: { 'fixture-ui': '1.0.0' },
        dsh: { profile: { bundles: ['fixture-ui'] } },
      }))
      await writeFile(join(pluginDir, 'package.json'), JSON.stringify({
        name: 'fixture-ui', version: '1.0.0', type: 'module', exports: './index.js',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }))
      await writeFile(join(pluginDir, 'index.js'), 'import "@deepseek-ai/dsh-tools"; export function apply() {}\n')
      await writeFile(join(pluginDir, 'cordis.patch.yml'), '- insert:\n  - id: fixture-ui\n    name: fixture-ui\n')
      const result = await execa(process.execPath, [
        '--import', 'tsx/esm', dshSourceBin, 'plugin', '--profile', 'web', 'doctor',
      ], {
        cwd: repoRoot, env: { DSH_HOME: home }, input: '', timeout: 25_000,
        killSignal: 'SIGKILL', reject: false,
      })
      expect(result.timedOut).toBe(false)
      expect(result.signal).toBeUndefined()
      expect(result.exitCode, result.stderr).toBe(0)
      const resolution = await createRuntimeResolution({ installAnchor: INSTALL_ANCHOR, home })
      expect(resolution.entries.some(entry => entry.name === '@deepseek-ai/dsh-tools' && entry.scope === 'installation')).toBe(true)
      await expect(access(join(home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json')))
        .rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(join(profileDir, 'package.json'), 'utf8')).toContain('fixture-ui')
      await expect(access(join(home, 'quarantine', 'profile-plugins.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  }, 30_000)

  it.each([
    ['node-pty', 0],
    ['node-pty@1.1.0', 1],
  ] as const)('drains plugin command completion for %s with status %i', async (packageName, exitCode) => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-plugin-exit-'))
    try {
      const observer = 'data:text/javascript,' + encodeURIComponent(
        'process.once("beforeExit", code => process.stdout.write(`plugin-drained:${code}\\n`))',
      )
      const result = await execa(process.execPath, [
        '--import', 'tsx/esm', '--import', observer, dshSourceBin,
        'plugin', '--profile', 'web', 'approve-build', packageName,
      ], {
        cwd: repoRoot,
        env: { DSH_HOME: home },
        input: '',
        timeout: 25_000,
        killSignal: 'SIGKILL',
        reject: false,
      })
      expect(result.timedOut).toBe(false)
      expect(result.signal).toBeUndefined()
      expect(result.exitCode).toBe(exitCode)
      expect(result.stdout).toContain(`plugin-drained:${exitCode}`)
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  }, 30_000)

  it('launches the source CLI without building', async () => {
    const rootPackage = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
      readonly scripts?: Record<string, string>
    }
    expect(rootPackage.scripts?.dsh).toBe('node --import tsx/esm apps/cli/src/bin.ts')
  })

  it('boots the source entry and requires a profile', async () => {
    const result = await execa(process.execPath, ['--import', 'tsx/esm', dshSourceBin], {
      cwd: repoRoot,
      input: '',
      timeout: 25_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    if (result.timedOut) {
      throw new Error(`dsh source launch did not exit within 25s. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
    }
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('--profile <name> is required')
    expect(result.stdout).toBe('')
  }, 30_000)
})
