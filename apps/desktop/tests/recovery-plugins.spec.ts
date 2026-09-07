import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isRecoveryPluginPackageName, readRecoveryPluginInventory } from '../src/recovery-plugins.ts'

describe('Desktop recovery plugin inventory', () => {
  it('lists direct external plugins without exposing paths and protects template bundles', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-recovery-plugins-'))
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules', 'example-plugin'), { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dependencies: {
        'example-plugin': `file:${join(home, 'bundled-plugins', 'example-plugin-1.2.3.tgz')}`,
        '@scope/registry-plugin': '^2.0.0',
      },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'example-plugin'] } },
    }))
    await writeFile(join(profile, 'node_modules', 'example-plugin', 'package.json'), JSON.stringify({
      name: 'example-plugin', version: '1.2.3',
    }))
    await mkdir(join(home, 'profile-health'), { recursive: true })
    await writeFile(join(home, 'profile-health', 'web.diagnostics.json'), JSON.stringify({
      schema: 'dsh/profile-diagnostic/v2', profile: 'web', issues: [{
        code: 'profile.module-resolution', attribution: { rootPackage: 'example-plugin' },
      }],
    }))

    await expect(readRecoveryPluginInventory(home)).resolves.toEqual({
      plugins: [
        {
          packageName: 'example-plugin', version: '1.2.3', source: 'bundled',
          status: 'attention', diagnosticCode: 'profile.module-resolution',
        },
        { packageName: '@scope/registry-plugin', source: 'registry', status: 'normal' },
      ],
      protectedCount: 2,
    })
  })

  it('accepts package identities but rejects command and path input', () => {
    expect(isRecoveryPluginPackageName('@scope/plugin')).toBe(true)
    expect(isRecoveryPluginPackageName('plugin-name')).toBe(true)
    expect(isRecoveryPluginPackageName('../plugin')).toBe(false)
    expect(isRecoveryPluginPackageName('plugin --force')).toBe(false)
  })
})
