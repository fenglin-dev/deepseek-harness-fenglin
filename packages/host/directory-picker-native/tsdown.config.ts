import { defineConfig } from 'tsdown'

/**
 * Node-only backend. The Win32 dialog worker builds as its own CJS entry,
 * path-loaded by the driver,
 * inlining the dialog logic while koffi stays an external native require.
 */
export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    // The artifact is lib/worker.cjs (the ./worker export the workspace
    // constraint keys on), bundled from the descriptive source entry.
    entry: { worker: 'src/win32-dialog-worker.ts' },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
])
