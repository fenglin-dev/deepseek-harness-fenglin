import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function isMissing(error) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
}

/**
 * Preserve pnpm's root workspace state around a production deploy.
 *
 * pnpm 11.7 writes the deploy's `--prod` selection back to the source
 * workspace even when the deployed tree lives elsewhere. A later `pnpm run`
 * then treats that production-only selection as the desired repair mode and
 * can remove development dependencies. The state file is generated metadata;
 * restoring its exact prior bytes keeps deploy isolated from the checkout.
 *
 * @template T
 * @param {string} root repository root containing node_modules
 * @param {() => Promise<T>} action production deploy operation
 * @returns {Promise<T>} action result
 */
export async function preservePnpmWorkspaceState(root, action) {
  const statePath = join(root, 'node_modules', '.pnpm-workspace-state-v1.json')
  const before = await readOptional(statePath)
  try {
    return await action()
  } finally {
    if (before !== undefined) {
      const after = await readOptional(statePath)
      if (after === undefined || !after.equals(before)) await writeFile(statePath, before)
    } else {
      await rm(statePath, { force: true })
    }
  }
}
