import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

interface Workflow {
  permissions: Record<string, string>
  concurrency: { group: string; 'cancel-in-progress': boolean }
  jobs: Record<string, {
    if?: string
    needs?: string
    permissions?: Record<string, string>
    environment?: { name: string }
    steps: { id?: string; uses?: string; run?: string; with?: Record<string, string> }[]
  }>
}

async function readWorkflow(name: string): Promise<Workflow> {
  return parse(await readFile(new URL(`../../../.github/workflows/${name}.yml`, import.meta.url), 'utf8')) as Workflow
}

describe('external tool compatibility publication', () => {
  it('signs checked coordinates and deploys only metadata through Pages without Release write permission', async () => {
    const workflow = await readWorkflow('external-tool-compatibility')
    expect(workflow.permissions).toEqual({ contents: 'read' })
    expect(workflow.concurrency).toEqual({ group: 'github-pages', 'cancel-in-progress': false })
    const publish = workflow.jobs.publish
    expect(publish.if).toBe("github.repository == 'flaqai/open-deepseek-harness-desktop' && github.ref == 'refs/heads/master'")
    expect(publish.permissions).toMatchObject({ contents: 'read', pages: 'read', 'id-token': 'write', attestations: 'write' })
    const check = publish.steps.findIndex(step => step.run === 'pnpm run verify:desktop:external-tools')
    const sign = publish.steps.findIndex(step => step.uses === 'actions/attest@v4')
    const upload = publish.steps.findIndex(step => step.uses === 'actions/upload-pages-artifact@v5')
    expect(check).toBeGreaterThanOrEqual(0)
    expect(sign).toBeGreaterThan(check)
    expect(upload).toBeGreaterThan(sign)
    expect(publish.steps[sign].with).toEqual({ 'subject-path': 'external-tools-compatibility.v1.json' })
    expect(publish.steps[upload].with).toEqual({ path: '.artifacts/external-tool-pages' })
    const commands = publish.steps.map(step => step.run ?? '').join('\n')
    expect(commands).toContain('.artifacts/external-tool-pages/metadata/external-tools/v1')
    expect(commands).toContain('external-tools-compatibility.sigstore.json')
    expect(commands).not.toMatch(/gh release|releases\/|GH_TOKEN/)
    expect(workflow.jobs.deploy).toMatchObject({
      needs: 'publish',
      permissions: { pages: 'write', 'id-token': 'write' },
      environment: { name: 'github-pages' },
    })
    expect(workflow.jobs.deploy.steps).toContainEqual({ id: 'deployment', uses: 'actions/deploy-pages@v5' })
  })

  it('keeps the documentation deploy from replacing the community metadata site', async () => {
    const workflow = await readWorkflow('docs-pages')
    expect(workflow.jobs.build.if).toBe("github.repository != 'flaqai/open-deepseek-harness-desktop'")
    expect(workflow.jobs.deploy.needs).toBe('build')
  })
})
