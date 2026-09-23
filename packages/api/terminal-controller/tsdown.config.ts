import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-terminal-controller',
  ['src/index.ts'],
  { hostPhase: true },
)
