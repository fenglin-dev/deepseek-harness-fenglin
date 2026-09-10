import { defineConfig } from 'tsdown'

/** Keep the file-backed desktop authority importable without loading Cordis. */
export default defineConfig({
  entry: ['lib/types/index.js', 'lib/types/persistent.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
