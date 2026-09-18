import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

interface WorkflowJob {
  readonly if?: string
  readonly needs?: string
  readonly env?: Record<string, string>
  readonly steps?: Array<{ name?: string; uses?: string; with?: Record<string, string>; run?: string }>
}

describe('desktop package workflow bundled plugins', () => {
  it('resolves one snapshot and reuses it in every platform package', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/desktop-packages.yml'), 'utf8')
    const workflow = parse(source) as { jobs: Record<string, WorkflowJob> }
    const resolver = workflow.jobs['bundled-plugins']
    expect(resolver?.steps?.some(step => step.run === 'pnpm run refresh:desktop:bundled-plugins')).toBe(true)
    expect(resolver?.steps?.some(step => step.with?.name === 'bundled-plugin-snapshot')).toBe(true)

    for (const name of ['macos', 'windows', 'linux']) {
      const job = workflow.jobs[name]
      expect(job?.needs).toBe('bundled-plugins')
      expect(job?.env?.DSH_BUNDLED_PLUGINS_REFRESH).toBe('0')
      expect(job?.steps?.some(step => (
        step.uses === 'actions/download-artifact@v4'
        && step.with?.name === 'bundled-plugin-snapshot'
        && step.with?.path === 'apps/desktop/bundled-plugins'
      ))).toBe(true)
    }
  })

  it('keeps the internal snapshot out of release artifact globs', () => {
    expect('bundled-plugin-snapshot').not.toMatch(/^desktop-/u)
  })

  it('allows each native platform to be packaged independently', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/desktop-packages.yml'), 'utf8')
    const workflow = parse(source) as {
      on: { workflow_dispatch: { inputs: { target: { options: string[] } } } }
      jobs: Record<string, WorkflowJob>
    }
    expect(workflow.on.workflow_dispatch.inputs.target.options).toEqual([
      'all', 'macos', 'windows-x64', 'linux-x64',
    ])
    expect(workflow.jobs.macos?.if).toContain("inputs.target == 'macos'")
    expect(workflow.jobs.windows?.if).toContain("inputs.target == 'windows-x64'")
    expect(workflow.jobs.linux?.if).toContain("inputs.target == 'linux-x64'")
    expect(workflow.jobs.checksums?.if).toContain("inputs.target == 'macos'")
    expect(workflow.jobs.checksums?.if).toContain("inputs.target == 'linux-x64'")
  })

  it('raises the macOS packaging file limit before electron-builder signs the expanded runtime', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/desktop-packages.yml'), 'utf8')
    const workflow = parse(source) as { jobs: Record<string, WorkflowJob> }
    const build = workflow.jobs.macos?.steps?.find(step => step.name === 'Build macOS package')
    expect(build?.run).toContain('ulimit -n 65536')
    expect(build?.run).toContain('pnpm run package:desktop:macos:${{ matrix.arch }}')
  })

  it('keeps packaging manual and leaves GitHub Release publication to the explicit local workflow', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/desktop-packages.yml'), 'utf8')
    const workflow = parse(source) as {
      on: { workflow_dispatch: { inputs: Record<string, unknown> } }
      permissions: Record<string, string>
      jobs: Record<string, WorkflowJob>
    }
    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch'])
    expect(Object.keys(workflow.on.workflow_dispatch.inputs)).toEqual(['target', 'refresh_plugins', 'windows_candidate_run_id'])
    expect(workflow.on.workflow_dispatch.inputs.refresh_plugins).toEqual({
      description: 'Resolve latest stable bundled plugins (disable for a packaging-only rebuild)',
      required: true,
      type: 'boolean',
      default: true,
    })
    expect(workflow.permissions).toEqual({ contents: 'read', actions: 'read' })
    expect(workflow.jobs.release).toBeUndefined()
    expect(source).not.toContain('gh release ')
  })

  it('separates reusable Windows candidates from the full installed smoke', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/desktop-packages.yml'), 'utf8')
    const workflow = parse(source) as { jobs: Record<string, WorkflowJob> }
    const build = workflow.jobs.windows
    const smoke = workflow.jobs['windows-smoke']

    expect(build?.steps?.some(step => step.run === 'node --test apps/desktop/scripts/runtime-deploy-config.test.mjs')).toBe(true)
    expect(build?.steps?.some(step => step.run === 'pnpm run build:community-desktop')).toBe(true)
    expect(build?.steps?.some(step => step.run === 'node apps/desktop/scripts/prepare-windows-runtime.mjs')).toBe(true)
    expect(build?.steps?.some(step => step.run === 'node apps/desktop/scripts/smoke-windows-unpacked.mjs')).toBe(true)
    expect(build?.steps?.some(step => step.with?.name === 'qualification-windows-x64-candidate')).toBe(true)

    expect(smoke?.if).toContain('inputs.windows_candidate_run_id')
    expect(smoke?.steps?.some(step => step.with?.['run-id'] === '${{ inputs.windows_candidate_run_id || github.run_id }}')).toBe(true)
    expect(smoke?.steps?.some(step => step.name === 'Collect Windows smoke diagnostics')).toBe(true)
    expect(smoke?.steps?.some(step => step.with?.name === 'qualification-windows-x64-diagnostics')).toBe(true)
    expect(smoke?.steps?.some(step => step.with?.name === 'desktop-windows-x64')).toBe(true)
  })
})
