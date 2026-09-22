export interface WorktreeIssue {
  readonly code: string
  readonly detail: string
}

export interface WorktreeInspection {
  readonly issues: WorktreeIssue[]
  readonly facts: Record<string, unknown>
}

export function isLinkedWorktree(root: string): boolean
export function parseWorkspacePatterns(text: string): string[]
export function parseLockfileImporters(text: string): Set<string>
export function pnpmInstallArgs(options: { readonly offline: boolean }): string[]
export function pnpmInstallEnvironment(
  options: { readonly offline: boolean; readonly registry?: string },
  base?: Record<string, string | undefined>,
): Record<string, string | undefined>
export function pnpmRegistryCandidates(configured: string): string[]
export function installWithRegistryFallback(options: {
  readonly configuredRegistry: string
  readonly offline: boolean
  readonly run: (registry: string | undefined) => number
}): {
  readonly status: number
  readonly attempts: Array<{ readonly registry: string | undefined; readonly status: number }>
}
export function nodeVersionSatisfies(version: string, range: string | undefined): boolean
export function inspectWorktree(
  root: string,
  options?: {
    readonly runner?: (
      executable: string,
      args: string[],
      options: unknown,
    ) => { readonly status: number | null; readonly stdout: string; readonly stderr?: string }
  },
): WorktreeInspection
export function formatWorktreeReport(result: WorktreeInspection): string
