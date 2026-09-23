import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-session-controller',
  ['src/index.ts'],
  { hostPhase: true },
)
