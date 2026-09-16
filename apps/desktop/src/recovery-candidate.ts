/** Settle a recovery-owned plugin candidate without leaving its Profile lease behind. */

export interface RecoveryCandidateActivationOptions {
  activate(): Promise<void>
  discard(): Promise<void>
  onRollback?(): Promise<void>
}

/**
 * Activate a recovery candidate, or discard it before returning the activation failure.
 * @param options - Narrow transaction operations owned by the Electron main process.
 */
export async function activateOrDiscardRecoveryCandidate(
  options: RecoveryCandidateActivationOptions,
): Promise<void> {
  try {
    await options.activate()
  } catch (activationError) {
    try {
      await options.discard()
      await options.onRollback?.()
    } catch (rollbackError) {
      const detail = rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      throw new Error(`desktop: recovery plugin candidate failed and could not be rolled back: ${detail}`, {
        cause: activationError,
      })
    }
    throw activationError
  }
}
