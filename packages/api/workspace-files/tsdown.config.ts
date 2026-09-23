import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-workspace-files',
  ['src/index.ts'],
  { hostPhase: true },
)
