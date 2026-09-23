import { defineConfig } from 'tsdown'

/**
 * The dsh CLI ships its command and the profile lifecycle shared with Desktop.
 * Declarations come from `tsc -b` (dts: false), matching every package.
 */
export default defineConfig({
  entry: ['src/bin.ts', 'src/profile-boot.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: ['lib/*.js'],
})
