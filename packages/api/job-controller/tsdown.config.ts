import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-job-controller',
  ['src/index.ts'],
  { hostPhase: true },
)
