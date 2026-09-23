import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-remotes',
  ['src/index.ts'],
  { hostPhase: true },
)
