import assert from 'node:assert/strict'
import test from 'node:test'
import { nodeRuntimeArchivesByTarget, nodeVersion } from './node-runtime-pins.mjs'

test('pins the official Node 24.21.0 desktop runtime archives', () => {
  assert.equal(nodeVersion, '24.21.0')
  assert.deepEqual(nodeRuntimeArchivesByTarget, {
    'darwin-arm64': {
      name: 'node-v24.21.0-darwin-arm64.tar.gz',
      sha256: 'bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057',
    },
    'darwin-x64': {
      name: 'node-v24.21.0-darwin-x64.tar.gz',
      sha256: '1462cb3b3046b815cf8ea436d3da450ec1a9f11dac7e5a46b0ada5305d7e8097',
    },
    'linux-x64': {
      name: 'node-v24.21.0-linux-x64.tar.gz',
      sha256: '6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff',
    },
    'win32-x64': {
      name: 'node-v24.21.0-win-x64.zip',
      sha256: '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541',
    },
  })
})

test('keeps every runtime digest in canonical SHA-256 form', () => {
  assert.deepEqual(Object.keys(nodeRuntimeArchivesByTarget).sort(), [
    'darwin-arm64',
    'darwin-x64',
    'linux-x64',
    'win32-x64',
  ])
  for (const archive of Object.values(nodeRuntimeArchivesByTarget)) {
    assert.match(archive.name, new RegExp(`^node-v${nodeVersion}-.+\\.(?:tar\\.gz|zip)$`))
    assert.match(archive.sha256, /^[0-9a-f]{64}$/)
  }
})
