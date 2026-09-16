/** Official Node.js runtime archives embedded by the desktop packages. */

export const nodeVersion = '24.21.0'

export const nodeRuntimeArchivesByTarget = Object.freeze({
  'darwin-arm64': Object.freeze({
    name: `node-v${nodeVersion}-darwin-arm64.tar.gz`,
    sha256: 'bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057',
  }),
  'darwin-x64': Object.freeze({
    name: `node-v${nodeVersion}-darwin-x64.tar.gz`,
    sha256: '1462cb3b3046b815cf8ea436d3da450ec1a9f11dac7e5a46b0ada5305d7e8097',
  }),
  'linux-x64': Object.freeze({
    name: `node-v${nodeVersion}-linux-x64.tar.gz`,
    sha256: '6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff',
  }),
  'win32-x64': Object.freeze({
    name: `node-v${nodeVersion}-win-x64.zip`,
    sha256: '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541',
  }),
})
