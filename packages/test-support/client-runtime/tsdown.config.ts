import { clientLibrary } from '../../client/tsdown.client.ts'

export default clientLibrary(
  '@deepseek-ai/dsh-client-test-runtime',
  ['src/index.ts'],
)
