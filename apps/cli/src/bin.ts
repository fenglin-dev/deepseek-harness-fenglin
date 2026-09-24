#!/usr/bin/env node
/**
 * Command-line entry for dsh.
 * @module @deepseek-ai/dsh/bin
 */

/* v8 ignore file -- built-bin acceptance exercises this self-executing dispatch. */

import { getDshRuntimeVersion, loadLayeredEnv, StartupError } from '@deepseek-ai/dsh-app-boot'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { parseDshArgs } from './args.ts'
import { claimDesktopWebLaunch } from './desktop-web-launch.ts'
import { reportStartupFailure } from './startup-diagnostics.ts'

/**
 * Run the public dsh command-line interface.
 * @returns a promise that settles when the selected command mode finishes.
 */
export async function runCli(): Promise<void> {
  const version = getDshRuntimeVersion()
  const invocation = parseDshArgs(process.argv.slice(2), version)

  switch (invocation.mode) {
    case 'profile': {
      if (!claimDesktopWebLaunch(invocation.profile, resolveDshHome(), process.env)) {
        console.error('dsh: Web replacement delegated to Desktop supervisor; no second service started')
        return
      }
      const { runProfile } = await import('./profile-boot.ts')
      try {
        await runProfile({
          environment: loadLayeredEnv('dsh'),
          profile: invocation.profile,
          fromDefaultProfile: invocation.fromDefaultProfile,
          patchFiles: invocation.patches,
          args: invocation.args,
          diagnosticMode: process.env.DSH_PROFILE_DIAGNOSTIC_MODE === '1',
          diagnosticModeOnFailure: process.env.DSH_PROFILE_DIAGNOSTIC_MODE_ON_FAILURE === '1',
        })
      } catch (error) {
        if (!(error instanceof StartupError)) throw error
        await reportStartupFailure(error, { home: resolveDshHome(), version, profile: invocation.profile })
        process.exitCode = 1
      }
      break
    }
    case 'plugin': {
      const { runPlugin } = await import('./plugin.ts')
      // Let native handles and output drain before Node tears down the process.
      process.exitCode = await runPlugin(invocation.profile, invocation.args)
      break
    }
    case 'dump-config': {
      const { runDumpConfig } = await import('./dump-config.ts')
      runDumpConfig(
        invocation.profile,
        invocation.defaultOnly,
        invocation.patches,
        invocation.fromDefaultProfile,
      )
      break
    }
    case 'dump-config-schema': {
      const { runDumpConfigSchema } = await import('./dump-config-schema.ts')
      await runDumpConfigSchema(invocation.profile, invocation.patches, invocation.fromDefaultProfile)
      break
    }
    default:
    invocation satisfies never
      throw new Error(`dsh: unhandled invocation mode ${JSON.stringify(invocation)}`)
  }
}

if (import.meta.main) {
  await runCli()
}
