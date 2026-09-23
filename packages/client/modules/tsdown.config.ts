import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-client-modules',
  ['src/index.ts', 'src/invariant.ts'],
)
